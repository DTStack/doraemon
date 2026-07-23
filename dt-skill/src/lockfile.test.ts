/* @vitest-environment node */
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { isPinned, readLockfile, withPinnedMetadata, writeLockfile } from './lockfile';

describe('lockfile', () => {
    it('writes and reads lockfile', async () => {
        const workdir = await mkdtemp(join(tmpdir(), 'dt-skill-work-'));
        await writeLockfile(workdir, {
            version: 1,
            skills: {
                demo: {
                    version: '1.0.0',
                    installedAt: 1,
                    pinned: true,
                    pinReason: 'awaiting moderation review',
                },
            },
        });
        const read = await readLockfile(workdir);
        expect(read.skills.demo?.version).toBe('1.0.0');
        expect(read.skills.demo?.pinned).toBe(true);
        expect(read.skills.demo?.pinReason).toBe('awaiting moderation review');
    });

    it('returns empty lockfile on invalid json', async () => {
        const workdir = await mkdtemp(join(tmpdir(), 'dt-skill-work-bad-'));
        await mkdir(join(workdir, '.dt-skill'), { recursive: true });
        await writeFile(join(workdir, '.dt-skill', 'lock.json'), '{', 'utf8');
        const read = await readLockfile(workdir);
        expect(read).toEqual({ version: 1, skills: {} });
    });

    it('returns empty lockfile on schema mismatch', async () => {
        const workdir = await mkdtemp(join(tmpdir(), 'dt-skill-work-schema-'));
        await mkdir(join(workdir, '.dt-skill'), { recursive: true });
        await writeFile(
            join(workdir, '.dt-skill', 'lock.json'),
            JSON.stringify({ version: 1, skills: 'nope' }),
            'utf8'
        );
        const read = await readLockfile(workdir);
        expect(read).toEqual({ version: 1, skills: {} });
    });

    it('withPinnedMetadata preserves pin across version change', () => {
        const entry = withPinnedMetadata('2.0.0', 99, {
            version: '1.0.0',
            installedAt: 1,
            pinned: true,
            pinReason: 'awaiting review',
        });
        expect(entry).toEqual({
            version: '2.0.0',
            installedAt: 99,
            pinned: true,
            pinReason: 'awaiting review',
        });
        expect(isPinned(entry)).toBe(true);
    });

    it('withPinnedMetadata drops pin when existing is unpinned', () => {
        const entry = withPinnedMetadata('2.0.0', 99, {
            version: '1.0.0',
            installedAt: 1,
        });
        expect(isPinned(entry)).toBe(false);
        expect(entry).toEqual({ version: '2.0.0', installedAt: 99 });
    });
});
