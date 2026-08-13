/* @vitest-environment node */
import { mkdir, mkdtemp, readlink, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

// codexHome is computed at module load from CODEX_HOME; pin it to a temp path
// so linkOrCopyToAgent writes symlinks under /tmp instead of the real ~/.codex.
const originalCodexHome = process.env.CODEX_HOME;
const CODEX_HOME = join(tmpdir(), 'dt-skill-codex-test-home');
process.env.CODEX_HOME = CODEX_HOME;

const { getAgentSkillsDir, getCanonicalSkillsDir, linkOrCopyToAgent } = await import(
    './installer.js'
);

afterEach(async () => {
    await rm(CODEX_HOME, { recursive: true, force: true }).catch(() => {});
});

afterAll(() => {
    if (originalCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = originalCodexHome;
});

describe('getAgentSkillsDir (global codex)', () => {
    it('resolves codex to ~/.codex/skills, not the canonical .agents/skills', () => {
        expect(getAgentSkillsDir('codex', true, '/work')).toBe(join(CODEX_HOME, 'skills'));
        expect(getAgentSkillsDir('codex', true, '/work')).not.toBe(
            getCanonicalSkillsDir(true, '/work')
        );
    });

    it('still maps project-scoped codex to the canonical dir (universal)', () => {
        const cwd = '/work';
        expect(getAgentSkillsDir('codex', false, cwd)).toBe(getCanonicalSkillsDir(false, cwd));
    });
});

describe('linkOrCopyToAgent (global codex symlink)', () => {
    it('creates a symlink for codex instead of skipping as universal', async () => {
        const workdir = await mkdtemp(join(tmpdir(), 'dt-skill-codex-wd-'));
        try {
            const canonicalDir = join(workdir, '.agents', 'skills', 'demo');
            await mkdir(canonicalDir, { recursive: true });
            await writeFile(join(canonicalDir, 'SKILL.md'), '# demo\n', 'utf8');

            const result = await linkOrCopyToAgent('demo', canonicalDir, 'codex', {
                global: true,
                cwd: workdir,
                mode: 'symlink',
            });

            const agentDir = join(CODEX_HOME, 'skills', 'demo');
            expect(result.success).toBe(true);
            expect(result.skipped).toBeFalsy();
            expect(result.mode).toBe('symlink');
            expect(result.path).toBe(agentDir);

            // The symlink resolves back to the canonical skill dir.
            const linkTarget = await readlink(agentDir);
            expect(resolve(dirname(agentDir), linkTarget)).toBe(resolve(canonicalDir));
        } finally {
            await rm(workdir, { recursive: true, force: true }).catch(() => {});
        }
    });
});
