/* @vitest-environment node */
import { mkdir, mkdtemp, readdir, readFile, readlink, rm, writeFile } from 'node:fs/promises';
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

    it('keeps amp/replit/universal on the canonical global dir (pre-fix behavior)', () => {
        for (const agent of ['amp', 'replit', 'universal'] as const) {
            expect(getAgentSkillsDir(agent, true, '/work')).toBe(
                getCanonicalSkillsDir(true, '/work')
            );
        }
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

describe('linkOrCopyToAgent (copy mode)', () => {
    it('keeps metadata.json and skips .git in the copied skill', async () => {
        const workdir = await mkdtemp(join(tmpdir(), 'dt-skill-copy-wd-'));
        try {
            const canonicalDir = join(workdir, '.agents', 'skills', 'demo');
            await mkdir(join(canonicalDir, '.git'), { recursive: true });
            await writeFile(join(canonicalDir, 'SKILL.md'), '# demo\n', 'utf8');
            await writeFile(join(canonicalDir, 'metadata.json'), '{"version":"2.0.1"}', 'utf8');
            await writeFile(join(canonicalDir, '.git', 'HEAD'), 'ref: refs/heads/main\n', 'utf8');

            const result = await linkOrCopyToAgent('demo', canonicalDir, 'claude-code', {
                global: false,
                cwd: workdir,
                mode: 'copy',
            });

            const agentDir = join(workdir, '.claude', 'skills', 'demo');
            expect(result.success).toBe(true);
            expect(result.mode).toBe('copy');
            expect(result.path).toBe(agentDir);
            expect((await readdir(agentDir)).sort()).toEqual(['SKILL.md', 'metadata.json']);
            expect(await readFile(join(agentDir, 'metadata.json'), 'utf8')).toBe(
                '{"version":"2.0.1"}'
            );
        } finally {
            await rm(workdir, { recursive: true, force: true }).catch(() => {});
        }
    });
});
