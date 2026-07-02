/* @vitest-environment node */
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as lockStore from '../lockfile.js';
import * as skillsStore from '../skills.js';
import { installExtractedSkill, type InstallTargets } from './installerPipeline.js';

// The pipeline's only real dependency is downloadZip. extract/origin/lock are
// in-process modules — we spy on them to keep the test off the real filesystem
// writes (mkdtemp gives us a real dir; we just don't want to materialize zips).
vi.spyOn(skillsStore, 'listTextFiles').mockResolvedValue([]);
vi.spyOn(skillsStore, 'hashSkillFiles').mockReturnValue({ fingerprint: 'fp', files: [] });
vi.spyOn(skillsStore, 'writeSkillOrigin').mockResolvedValue(undefined);
const extractZipSpy = vi.spyOn(skillsStore, 'extractZipToDir').mockResolvedValue(undefined);
const writeLockfileSpy = vi.spyOn(lockStore, 'writeLockfile').mockResolvedValue(undefined);

const targets: InstallTargets = { agents: [], global: false, mode: 'copy' };

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('installExtractedSkill http seam', () => {
    it('downloads via the injected http adapter, not a module singleton', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'dt-pipeline-'));
        await mkdir(dir, { recursive: true });
        const workdir = await mkdtemp(join(tmpdir(), 'dt-pipeline-wd-'));
        const downloadZip = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));

        await installExtractedSkill(
            {
                slug: 'demo',
                version: '1.0.0',
                canonicalDir: dir,
                canonicalWorkdir: workdir,
                targets,
                registry: 'https://example.com',
                base: '/work',
                lock: { version: 1, skills: {} },
                spinner: { text: '' },
            },
            { downloadZip }
        );

        // Two adapters justify the seam: here the fake. The pipeline called it,
        // not the real http module.
        expect(downloadZip).toHaveBeenCalledWith('https://example.com', {
            slug: 'demo',
            version: '1.0.0',
        });
        expect(extractZipSpy).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), dir);
        expect(writeLockfileSpy).toHaveBeenCalledWith(
            workdir,
            expect.objectContaining({
                version: 1,
                skills: { demo: expect.objectContaining({ version: '1.0.0' }) },
            })
        );
    });

    it('propagates download failures so callers handle the error', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'dt-pipeline-fail-'));
        await mkdir(dir, { recursive: true });
        const workdir = await mkdtemp(join(tmpdir(), 'dt-pipeline-fail-wd-'));
        const downloadZip = vi.fn().mockRejectedValue(new Error('boom'));

        await expect(
            installExtractedSkill(
                {
                    slug: 'demo',
                    version: '1.0.0',
                    canonicalDir: dir,
                    canonicalWorkdir: workdir,
                    targets,
                    registry: 'https://example.com',
                    base: '/work',
                    lock: { version: 1, skills: {} },
                    spinner: { text: '' },
                },
                { downloadZip }
            )
        ).rejects.toThrow('boom');

        expect(writeLockfileSpy).not.toHaveBeenCalled();
    });
});
