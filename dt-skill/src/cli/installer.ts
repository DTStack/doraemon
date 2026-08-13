// Physical installer: canonical .agents/skills extraction + cross-platform
// symlinks (junctions on Windows) with copy fallback. Ported from
// vercel-labs/skills src/installer.ts, trimmed to dt-skill's zip-based flow.
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, rm, stat, symlink } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { dirname, join, normalize, relative, resolve, sep } from 'node:path';

import { AGENT_DEFINITIONS, type AgentType, isUniversalAgent } from './agents/definitions.js';

const AGENTS_DIR = '.agents';
const SKILLS_SUBDIR = 'skills';

export type InstallMode = 'symlink' | 'copy';

export interface InstallResult {
    success: boolean;
    /** Agent-specific skill directory (symlink/copy target), or canonical for universal. */
    path: string;
    /** Canonical .agents/skills/<slug> directory. */
    canonicalPath?: string;
    mode: InstallMode;
    symlinkFailed?: boolean;
    skipped?: boolean;
    error?: string;
}

/** Sanitize a skill name into a safe single path segment (kebab-case, no traversal). */
export function sanitizeName(name: string): string {
    const sanitized = name
        .toLowerCase()
        .replace(/[^a-z0-9._]+/g, '-')
        .replace(/^[.\-]+|[.\-]+$/g, '');
    return sanitized.substring(0, 255) || 'unnamed-skill';
}

function isPathSafe(basePath: string, targetPath: string): boolean {
    const normalizedBase = normalize(resolve(basePath));
    const normalizedTarget = normalize(resolve(targetPath));
    return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}

export function getCanonicalSkillsDir(global: boolean, cwd: string = process.cwd()): string {
    const baseDir = global ? homedir() : cwd;
    return join(baseDir, AGENTS_DIR, SKILLS_SUBDIR);
}

/** Parent of the canonical skills dir; holds .dt-skill/lock.json. */
export function getCanonicalWorkdir(global: boolean, cwd: string = process.cwd()): string {
    const baseDir = global ? homedir() : cwd;
    return join(baseDir, AGENTS_DIR);
}

export function getCanonicalPath(
    skillName: string,
    options: { global?: boolean; cwd?: string } = {}
): string {
    const sanitized = sanitizeName(skillName);
    const canonicalBase = getCanonicalSkillsDir(options.global ?? false, options.cwd);
    const canonicalPath = join(canonicalBase, sanitized);
    if (!isPathSafe(canonicalBase, canonicalPath)) {
        throw new Error('Invalid skill name: potential path traversal detected');
    }
    return canonicalPath;
}

/**
 * Skills directory for a specific agent. Universal agents share the canonical
 * .agents/skills dir; others use their agent-specific dir.
 */
export function getAgentSkillsDir(
    agentType: AgentType,
    global: boolean,
    cwd: string = process.cwd()
): string {
    const agent = AGENT_DEFINITIONS[agentType];
    if (global) {
        if (agent.globalSkillsDir !== undefined) {
            return agent.globalSkillsDir;
        }
        if (isUniversalAgent(agentType)) {
            return getCanonicalSkillsDir(true, cwd);
        }
        return join(homedir(), agent.skillsDir);
    }
    if (isUniversalAgent(agentType)) {
        return getCanonicalSkillsDir(false, cwd);
    }
    return join(cwd, agent.skillsDir);
}

async function cleanAndCreateDirectory(path: string): Promise<void> {
    try {
        await rm(path, { recursive: true, force: true });
    } catch {
        // Ignore — mkdir will surface real failures.
    }
    await mkdir(path, { recursive: true });
}

/**
 * Create a symlink. Windows uses absolute junctions (no Developer Mode needed);
 * Unix uses relative symlinks. Returns false on failure so callers can copy.
 */
export async function createSymlink(target: string, linkPath: string): Promise<boolean> {
    try {
        // ponytail: linkPath points into a freshly-created canonical tree, so
        // parent dirs are never pre-existing symlinks — no realpath/ELOOP guards
        // needed. rm(force) is a no-op when nothing exists yet.
        await rm(linkPath, { recursive: true, force: true });
        const linkDir = dirname(linkPath);
        await mkdir(linkDir, { recursive: true });
        const symlinkType = platform() === 'win32' ? 'junction' : undefined;
        // Relative on Unix so the project tree stays movable; junction needs absolute.
        const symlinkTarget =
            symlinkType === 'junction' ? resolve(target) : relative(linkDir, target);
        await symlink(symlinkTarget, linkPath, symlinkType);
        return true;
    } catch {
        return false;
    }
}

const EXCLUDE_FILES = new Set(['metadata.json']);
const EXCLUDE_DIRS = new Set(['.git', '__pycache__', '__pypackages__']);

const isExcluded = (name: string, isDirectory = false) => {
    if (EXCLUDE_FILES.has(name)) return true;
    if (isDirectory && EXCLUDE_DIRS.has(name)) return true;
    return false;
};

export async function copyDirectory(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    await Promise.all(
        entries
            .filter((entry) => !isExcluded(entry.name, entry.isDirectory()))
            .map(async (entry) => {
                const srcPath = join(src, entry.name);
                const destPath = join(dest, entry.name);
                if (entry.isDirectory()) {
                    await copyDirectory(srcPath, destPath);
                } else {
                    await cp(srcPath, destPath, { dereference: true, recursive: true });
                }
            })
    );
}

/**
 * Install an already-extracted canonical skill directory to a single agent.
 * Universal agents are a no-op (canonical IS their dir). For project-scoped
 * non-universal agents whose config dir doesn't exist, skip the symlink (the
 * skill is still available via .agents/skills) — matches vercel-labs/skills.
 */
export async function linkOrCopyToAgent(
    slug: string,
    canonicalDir: string,
    agentType: AgentType,
    options: { global: boolean; cwd?: string; mode: InstallMode }
): Promise<InstallResult> {
    const { global, mode } = options;
    const cwd = options.cwd ?? process.cwd();
    const agent = AGENT_DEFINITIONS[agentType];
    const skillName = sanitizeName(slug);
    const agentBase = getAgentSkillsDir(agentType, global, cwd);
    const agentDir = join(agentBase, skillName);

    if (!isPathSafe(agentBase, agentDir)) {
        return {
            success: false,
            path: agentDir,
            mode,
            error: 'Invalid skill name: potential path traversal detected',
        };
    }

    // If the agent's install dir IS the canonical dir, no extra entry is needed.
    // Universal agents share .agents/skills; non-universal agents whose global dir
    // differs from canonical (e.g. codex -> ~/.codex/skills) still need a symlink.
    if (resolve(agentBase) === resolve(getCanonicalSkillsDir(global, cwd))) {
        return {
            success: true,
            path: canonicalDir,
            canonicalPath: canonicalDir,
            mode,
            skipped: true,
        };
    }

    if (global && agent.globalSkillsDir === undefined) {
        return {
            success: false,
            path: agentDir,
            mode,
            error: `${agent.displayName} does not support global skill installation`,
        };
    }

    try {
        if (mode === 'copy') {
            await cleanAndCreateDirectory(agentDir);
            await copyDirectory(canonicalDir, agentDir);
            return { success: true, path: agentDir, canonicalPath: canonicalDir, mode: 'copy' };
        }

        // Symlink mode. For project-scoped non-universal agents whose config dir
        // doesn't exist, skip — avoids creating .windsurf/, .kiro/, etc.
        if (!global) {
            const agentRootDir = join(cwd, agent.skillsDir.split('/')[0]!);
            if (!existsSync(agentRootDir)) {
                return {
                    success: true,
                    path: canonicalDir,
                    canonicalPath: canonicalDir,
                    mode,
                    skipped: true,
                };
            }
        }

        const created = await createSymlink(canonicalDir, agentDir);
        if (!created) {
            await cleanAndCreateDirectory(agentDir);
            await copyDirectory(canonicalDir, agentDir);
            return {
                success: true,
                path: agentDir,
                canonicalPath: canonicalDir,
                mode: 'symlink',
                symlinkFailed: true,
            };
        }
        return { success: true, path: agentDir, canonicalPath: canonicalDir, mode: 'symlink' };
    } catch (error) {
        return {
            success: false,
            path: agentDir,
            mode,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export async function isSkillInstalled(
    skillName: string,
    agentType: AgentType,
    options: { global?: boolean; cwd?: string } = {}
): Promise<boolean> {
    const agent = AGENT_DEFINITIONS[agentType];
    const sanitized = sanitizeName(skillName);
    if (options.global && agent.globalSkillsDir === undefined) return false;
    const targetBase = getAgentSkillsDir(agentType, options.global ?? false, options.cwd);
    const skillDir = join(targetBase, sanitized);
    if (!isPathSafe(targetBase, skillDir)) return false;
    try {
        await stat(skillDir);
        return true;
    } catch {
        return false;
    }
}
