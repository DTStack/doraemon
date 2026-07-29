import { spawnSync } from 'node:child_process';

/** Matches server skills.contributor VARCHAR(50) / MAX_CONTRIBUTOR_LENGTH. */
export const MAX_CONTRIBUTOR_LENGTH = 50;

/**
 * Read git user.name for the given working directory (repo-local, then global).
 * Uses the caller's cwd semantics: pass process.cwd() at publish time.
 */
export function resolveGitUserName(
    cwd: string = process.cwd(),
    env: NodeJS.ProcessEnv = process.env
): string | null {
    const result = spawnSync('git', ['-C', cwd, 'config', 'user.name'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        env,
    });
    if (result.status !== 0) return null;
    const value = String(result.stdout || '').trim();
    return value || null;
}

/**
 * Contributor for local publish: git user.name, or null when unset.
 * Throws when name exceeds MAX_CONTRIBUTOR_LENGTH (CLI fails before upload).
 */
export function resolvePublishContributor(
    cwd: string = process.cwd(),
    env: NodeJS.ProcessEnv = process.env
): string | null {
    const name = resolveGitUserName(cwd, env);
    if (!name) return null;
    if (name.length > MAX_CONTRIBUTOR_LENGTH) {
        throw new Error(
            `contributor 不能超过 ${MAX_CONTRIBUTOR_LENGTH} 个字符（当前 git user.name 为 ${name.length} 字）`
        );
    }
    return name;
}
