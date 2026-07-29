/* @vitest-environment node */

import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
    MAX_CONTRIBUTOR_LENGTH,
    resolveGitUserName,
    resolvePublishContributor,
} from './gitContributor.js';

function runGit(cwd: string, args: string[], env?: NodeJS.ProcessEnv) {
    const result = spawnSync('git', ['-C', cwd, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: env ?? process.env,
    });
    if (result.status !== 0) {
        throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
    }
}

const tempDirs: string[] = [];

afterEach(async () => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir) await rm(dir, { recursive: true, force: true });
    }
});

async function makeIsolatedGitEnv() {
    const home = await mkdtemp(join(tmpdir(), 'dt-skill-git-home-'));
    tempDirs.push(home);
    const globalConfig = join(home, 'gitconfig');
    await writeFile(globalConfig, '', 'utf8');
    return {
        ...process.env,
        HOME: home,
        GIT_CONFIG_GLOBAL: globalConfig,
        GIT_CONFIG_SYSTEM: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
    };
}

async function makeGitDir(localName: string | null, env: NodeJS.ProcessEnv) {
    const dir = await mkdtemp(join(tmpdir(), 'dt-skill-git-contributor-'));
    tempDirs.push(dir);
    runGit(dir, ['init'], env);
    runGit(dir, ['config', 'user.email', 'test@example.com'], env);
    if (localName !== null) {
        runGit(dir, ['config', 'user.name', localName], env);
    }
    return dir;
}

describe('resolveGitUserName', () => {
    it('reads user.name from the given cwd repo', async () => {
        const env = await makeIsolatedGitEnv();
        const dir = await makeGitDir('张三', env);
        expect(resolveGitUserName(dir, env)).toBe('张三');
    });

    it('returns null when user.name is unset', async () => {
        const env = await makeIsolatedGitEnv();
        const dir = await makeGitDir(null, env);
        expect(resolveGitUserName(dir, env)).toBeNull();
    });
});

describe('resolvePublishContributor', () => {
    it('returns null when git user.name is unset', async () => {
        const env = await makeIsolatedGitEnv();
        const dir = await makeGitDir(null, env);
        expect(resolvePublishContributor(dir, env)).toBeNull();
    });

    it('returns git user.name when within length limit', async () => {
        const env = await makeIsolatedGitEnv();
        const dir = await makeGitDir('李四', env);
        expect(resolvePublishContributor(dir, env)).toBe('李四');
    });

    it('throws when git user.name exceeds MAX_CONTRIBUTOR_LENGTH', async () => {
        const env = await makeIsolatedGitEnv();
        const longName = 'x'.repeat(MAX_CONTRIBUTOR_LENGTH + 1);
        const dir = await makeGitDir(longName, env);
        expect(() => resolvePublishContributor(dir, env)).toThrow(/不能超过 50/);
        expect(() => resolvePublishContributor(dir, env)).toThrow(
            new RegExp(`当前 git user.name 为 ${MAX_CONTRIBUTOR_LENGTH + 1} 字`)
        );
    });

    it('returns name at exactly MAX_CONTRIBUTOR_LENGTH', async () => {
        const env = await makeIsolatedGitEnv();
        const exact = 'y'.repeat(MAX_CONTRIBUTOR_LENGTH);
        const dir = await makeGitDir(exact, env);
        expect(resolvePublishContributor(dir, env)).toBe(exact);
    });
});
