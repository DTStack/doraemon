import { lstat, mkdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import { apiRequest, downloadZip, registryUrl } from '../../http.js';
import {
    formatPinnedDetails,
    isPinned as isPinnedSkillEntry,
    readLockfile,
    writeLockfile,
} from '../../lockfile.js';
import {
    ApiRoutes,
    type ApiV1SearchResponse,
    ApiV1SearchResponseSchema,
    type ApiV1SkillListResponse,
    ApiV1SkillListResponseSchema,
    type ApiV1SkillResponse,
    ApiV1SkillResponseSchema,
    ApiV1SkillVersionResponseSchema,
} from '../../schema/index.js';
import { listManualSkills } from '../../skills.js';
import {
    AGENT_DEFINITIONS,
    type AgentType,
    detectInstalledAgents,
    getAgentLabel,
    getUniversalAgents,
} from '../agents.js';
import {
    getCanonicalPath,
    getCanonicalSkillsDir,
    getCanonicalWorkdir,
    type InstallMode,
} from '../installer.js';
import { installExtractedSkill, type InstallTargets } from '../installerPipeline.js';
import { cancelSymbol, searchMultiselect } from '../prompts/search-multiselect.js';
import { getRegistry } from '../registry.js';
import type { GlobalOpts } from '../types.js';
import {
    createSpinner,
    fail,
    formatError,
    isCancelledValue,
    isInteractive,
    noteSummary,
    printSkillsLogo,
    promptConfirm,
    selectAgentsInteractive,
    selectInstallMethod,
    selectScope,
} from '../ui.js';
import { fileExists, normalizeSkillSlugOrFail } from './skillHelpers.js';

const SUSPICIOUS_WARNING =
    '\n⚠️  Warning: "{slug}" is flagged for ClawHub security review.\n' +
    '   This skill may contain risky patterns (crypto keys, external APIs, eval, etc.)\n' +
    '   Review the skill code before use.\n';

/**
 * Moderation suspicious-prompt decision tree. Shared by the resolved-skill,
 * one-skill, and update paths so the suspicious branching lives in one place.
 * Malware-block is checked separately by callers (it must run at different
 * points in each flow). Returns true to proceed, throws via fail() to abort.
 */
async function checkSuspiciousModeration(
    moderation: { isSuspicious?: boolean } | null | undefined,
    slug: string,
    force: boolean,
    allowPrompt: boolean,
    onConfirm: () => void
): Promise<void> {
    if (moderation?.isSuspicious && !force) {
        console.log(SUSPICIOUS_WARNING.replace('{slug}', slug));
        if (!allowPrompt) {
            fail('Use --force to install suspicious skills in non-interactive mode');
        }
        const confirm = await promptConfirm('Install anyway?');
        if (!confirm) fail('Installation cancelled');
        onConfirm();
    }
}

/** Verify an explicit version exists before any destructive rm. */
async function verifyVersion(registry: string, slug: string, version: string): Promise<void> {
    await apiRequest(
        registry,
        {
            method: 'GET',
            path: `${ApiRoutes.skills}/${encodeURIComponent(slug)}/versions/${encodeURIComponent(
                version
            )}`,
        },
        ApiV1SkillVersionResponseSchema
    );
}

function formatSearchOwner(entry: {
    ownerHandle?: string | null;
    owner?: { handle?: string | null; displayName?: string | null } | null;
}) {
    const handle = entry.ownerHandle ?? entry.owner?.handle;
    if (handle) return `@${handle}`;
    return entry.owner?.displayName ?? 'unknown owner';
}

/** Project root (or home) derived from the canonical workdir (<base>/.agents). */
function projectBase(opts: GlobalOpts): string {
    return dirname(opts.workdir);
}

/** Always include universal agents (they share the canonical .agents/skills dir). */
function ensureUniversalAgents(agents: AgentType[]): AgentType[] {
    const result = [...agents];
    for (const ua of getUniversalAgents()) {
        if (!result.includes(ua)) result.push(ua);
    }
    return result;
}

/**
 * Resolve install targets (agents, scope, mode). Interactive TUI when possible,
 * otherwise driven by --yes/--agent/--global/--copy flags. Returns null if the
 * user cancelled.
 */
async function resolveInstallTargets(opts: GlobalOpts): Promise<InstallTargets | null> {
    const explicitAgents = opts.agent as AgentType[] | undefined;

    // Non-interactive: derive everything from flags / detection.
    if (opts.yes || !isInteractive()) {
        let agents: AgentType[];
        if (explicitAgents && explicitAgents.length > 0) {
            agents = ensureUniversalAgents(explicitAgents);
        } else {
            const detected = detectInstalledAgents();
            agents = ensureUniversalAgents(detected.length > 0 ? detected : getUniversalAgents());
        }
        const global = opts.globalScope ?? false;
        const mode: InstallMode = opts.copy ? 'copy' : 'symlink';
        return { agents, global, mode };
    }

    // Interactive TUI. (Logo is printed by cmdInstall before skill selection.)
    let agents: AgentType[];
    if (explicitAgents && explicitAgents.length > 0) {
        agents = ensureUniversalAgents(explicitAgents);
    } else {
        const selected = await selectAgentsInteractive({ global: opts.globalScope });
        if (isCancelledValue(selected)) {
            console.log('Installation cancelled');
            return null;
        }
        agents = ensureUniversalAgents(selected);
    }

    let global = opts.globalScope ?? false;
    if (opts.globalScopeExplicit) {
        global = opts.globalScope ?? false;
    } else {
        const supportsGlobal = agents.some(
            (a) => AGENT_DEFINITIONS[a].globalSkillsDir !== undefined
        );
        if (supportsGlobal) {
            const scope = await selectScope();
            if (scope === null) {
                console.log('Installation cancelled');
                return null;
            }
            global = scope;
        }
    }

    // Method prompt only matters when agents target more than one unique skills dir.
    const base = global ? '' : projectBase(opts);
    const uniqueDirs = new Set(
        agents.map((a) =>
            global
                ? AGENT_DEFINITIONS[a].globalSkillsDir
                : join(base, AGENT_DEFINITIONS[a].skillsDir)
        )
    );
    let mode: InstallMode;
    if (opts.copy) {
        mode = 'copy';
    } else if (uniqueDirs.size > 1) {
        const method = await selectInstallMethod();
        if (method === null) {
            console.log('Installation cancelled');
            return null;
        }
        mode = method;
    } else {
        mode = 'copy'; // single target dir — symlink is meaningless
    }

    return { agents, global, mode };
}

function buildAgentSummaryLines(agents: AgentType[], mode: InstallMode): string[] {
    const universal: string[] = [];
    const symlinked: string[] = [];
    for (const a of agents) {
        if (AGENT_DEFINITIONS[a].skillsDir === '.agents/skills') universal.push(getAgentLabel(a));
        else symlinked.push(getAgentLabel(a));
    }
    const lines: string[] = [];
    const formatList = (items: string[]) =>
        items.length <= 5
            ? items.join(', ')
            : `${items.slice(0, 5).join(', ')} +${items.length - 5} more`;
    if (mode === 'symlink') {
        if (universal.length > 0) lines.push(`  universal: ${formatList(universal)}`);
        if (symlinked.length > 0) lines.push(`  symlink → ${formatList(symlinked)}`);
    } else {
        lines.push(`  copy → ${formatList(agents.map(getAgentLabel))}`);
    }
    return lines;
}

export async function cmdSearch(opts: GlobalOpts, query: string, limit?: number) {
    if (!query) fail('Query required');

    const registry = await getRegistry(opts, { cache: true });
    const spinner = createSpinner('Searching');
    try {
        const url = registryUrl(ApiRoutes.search, registry);
        url.searchParams.set('q', query);
        const effectiveLimit = typeof limit === 'number' && Number.isFinite(limit) ? limit : 25;
        url.searchParams.set('limit', String(effectiveLimit));
        const result = await apiRequest<ApiV1SearchResponse>(
            registry,
            { method: 'GET', url: url.toString() },
            ApiV1SearchResponseSchema
        );

        spinner.stop();
        for (const entry of result.results) {
            const slug = entry.slug ?? 'unknown';
            const name = entry.displayName ?? slug;
            const version = entry.version ? ` v${entry.version}` : '';
            console.log(
                `${slug}${version}  ${formatSearchOwner(entry)}  ${name}  (${entry.score.toFixed(
                    3
                )})`
            );
        }
    } catch (error) {
        spinner.fail(formatError(error));
        throw error;
    }
}

export async function cmdInstall(
    opts: GlobalOpts,
    rawSlug: string | string[],
    versionFlag?: string,
    force = false
) {
    // `<slugs...>` is variadic, so commander always passes an array. A single
    // slug still gets the skills-first interactive flow; multiple slugs go batch.
    const slugArray = Array.isArray(rawSlug) ? rawSlug : [rawSlug];
    const isBatch = slugArray.length > 1;

    // Interactive banner prints once at the very start (before skill selection),
    // matching `npx skills add`.
    if (!opts.yes && isInteractive()) {
        printSkillsLogo();
    }

    const registry = await getRegistry(opts, { cache: true });

    // ── Single slug: select skills FIRST, then agents/scope/method. ──
    // For packages this means sub-skills are chosen before the agent TUI.
    if (!isBatch) {
        const slug = normalizeSkillSlugOrFail(slugArray[0] as string);
        const spinner = createSpinner(`Resolving ${slug}`);
        let skillMeta: ApiV1SkillResponse;
        try {
            skillMeta = await apiRequest<ApiV1SkillResponse>(
                registry,
                { method: 'GET', path: `${ApiRoutes.skills}/${encodeURIComponent(slug)}` },
                ApiV1SkillResponseSchema
            );
        } catch (error) {
            spinner.fail(formatError(error));
            throw error;
        }

        if (skillMeta.moderation?.isMalwareBlocked) {
            spinner.fail(`Blocked: ${slug} is flagged as malicious`);
            fail('This skill has been flagged as malware and cannot be installed.');
        }

        // Resolve the flat list of skills to install (expand packages up front).
        const skillsToInstall: ResolvedSkill[] = [];
        if (skillMeta.skill && skillMeta.skill.isPackage) {
            spinner.stop();
            const children = skillMeta.skill.children ?? [];
            if (children.length === 0) {
                fail(`Skill package "${slug}" has no children skills.`);
            }
            const items = children.map((c) => ({
                value: c.slug,
                label: c.displayName || c.slug,
                hint: c.summary || undefined,
            }));
            let selectedSlugs: string[] | symbol;
            if (opts.yes) {
                selectedSlugs = children.map((c) => c.slug);
            } else {
                selectedSlugs = await searchMultiselect({
                    message: `Select skills from package "${slug}" to install:`,
                    items,
                    required: true,
                });
            }
            if (
                selectedSlugs === cancelSymbol ||
                !Array.isArray(selectedSlugs) ||
                selectedSlugs.length === 0
            ) {
                console.log('Installation cancelled');
                return;
            }
            for (const subSlug of selectedSlugs) {
                const subSkill = children.find((c) => c.slug === subSlug);
                const subVersion = String(subSkill?.version || '') || 'latest';
                skillsToInstall.push({
                    slug: subSlug,
                    version: subVersion,
                    meta: null,
                    explicitVersion: undefined,
                });
            }
        } else {
            spinner.stop();
            const version = versionFlag ?? skillMeta.latestVersion?.version ?? 'latest';
            skillsToInstall.push({ slug, version, meta: skillMeta, explicitVersion: versionFlag });
        }

        // Now the agent / scope / method TUI.
        const targets = await resolveInstallTargets(opts);
        if (!targets) return;
        const base = targets.global ? homedir() : projectBase(opts);
        const canonicalWorkdir = getCanonicalWorkdir(targets.global, base);
        const canonicalSkillsDir = getCanonicalSkillsDir(targets.global, base);
        await mkdir(canonicalSkillsDir, { recursive: true });

        if (!opts.yes && isInteractive()) {
            noteSummary(buildSummaryLines(skillsToInstall, targets, base), 'Installation Summary');
            const confirmed = await promptConfirm('Proceed with installation?');
            if (!confirmed) {
                console.log('Installation cancelled');
                return;
            }
        }

        for (const skill of skillsToInstall) {
            await installResolvedSkill(
                skill,
                force,
                targets,
                registry,
                canonicalWorkdir,
                canonicalSkillsDir,
                base
            );
        }
        return;
    }

    // ── Batch: resolve agents once, then install each slug (per-slug failure resilient). ──
    const slugs = slugArray;
    const targets = await resolveInstallTargets(opts);
    if (!targets) return;
    const base = targets.global ? homedir() : projectBase(opts);
    const canonicalWorkdir = getCanonicalWorkdir(targets.global, base);
    const canonicalSkillsDir = getCanonicalSkillsDir(targets.global, base);
    await mkdir(canonicalSkillsDir, { recursive: true });

    if (!opts.yes && isInteractive()) {
        const fakeSkills: ResolvedSkill[] = slugs.map((s) => ({
            slug: s,
            version: versionFlag ?? 'latest',
            meta: null,
            explicitVersion: versionFlag,
        }));
        noteSummary(buildSummaryLines(fakeSkills, targets, base), 'Installation Summary');
        const confirmed = await promptConfirm('Proceed with installation?');
        if (!confirmed) {
            console.log('Installation cancelled');
            return;
        }
    }

    const results: { slug: string; status: 'ok' | 'fail' }[] = [];
    for (const slug of slugs) {
        try {
            await installOneSkill(
                opts,
                slug,
                versionFlag,
                force,
                targets,
                registry,
                canonicalWorkdir,
                canonicalSkillsDir,
                base
            );
            results.push({ slug, status: 'ok' });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.log(`✖ ${slug}: ${message}`);
            results.push({ slug, status: 'fail' });
        }
    }
    const okCount = results.filter((r) => r.status === 'ok').length;
    const failCount = results.filter((r) => r.status === 'fail').length;
    console.log(`Summary: ${okCount} ok, ${failCount} fail`);
    if (failCount > 0) {
        process.exitCode = 1;
    }
}

interface ResolvedSkill {
    slug: string;
    version: string;
    meta: ApiV1SkillResponse | null;
    explicitVersion?: string;
}

function buildSummaryLines(
    skills: ResolvedSkill[],
    targets: InstallTargets,
    base: string
): string[] {
    const lines: string[] = [];
    for (const skill of skills) {
        if (lines.length > 0) lines.push('');
        lines.push(
            getCanonicalPath(skill.slug, {
                global: targets.global,
                cwd: targets.global ? undefined : base,
            })
        );
        lines.push(...buildAgentSummaryLines(targets.agents, targets.mode));
    }
    return lines;
}

/** Install one already-resolved skill: pinned check, moderation, version check, then extract+link+lock. */
async function installResolvedSkill(
    skill: ResolvedSkill,
    force: boolean,
    targets: InstallTargets,
    registry: string,
    canonicalWorkdir: string,
    canonicalSkillsDir: string,
    base: string
) {
    const { slug, version, meta, explicitVersion } = skill;
    const canonicalDir = join(canonicalSkillsDir, slug);

    const lock = await readLockfile(canonicalWorkdir);
    const existingEntry = lock.skills[slug];
    if (isPinnedSkillEntry(existingEntry)) {
        fail(`skill "${slug}" is pinned; run \`dt-skill unpin ${slug}\` first`);
    }

    const spinner = createSpinner(`Installing ${slug}@${version}`);
    try {
        await checkSuspiciousModeration(meta?.moderation, slug, force, isInteractive(), () =>
            spinner.start(`Installing ${slug}@${version}`)
        );

        if (explicitVersion && explicitVersion === version) {
            await verifyVersion(registry, slug, version);
        }

        if (!force) {
            const exists = await fileExists(canonicalDir);
            if (exists) fail(`Already installed: ${canonicalDir} (use --force)`);
        }
        if (force) {
            await rm(canonicalDir, { recursive: true, force: true });
        }

        await installExtractedSkill(
            {
                slug,
                version,
                canonicalDir,
                canonicalWorkdir,
                targets,
                registry,
                base,
                lock,
                existingEntry,
                spinner,
            },
            { downloadZip }
        );
        spinner.succeed(`OK. Installed ${slug} -> ${canonicalDir}`);
    } catch (error) {
        spinner.fail(formatError(error));
        throw error;
    }
}

/** Install a single (non-batch) skill: metadata, moderation, extract, origin, link, lock. */
async function installOneSkill(
    opts: GlobalOpts,
    rawSlug: string,
    versionFlag: string | undefined,
    force: boolean,
    targets: InstallTargets,
    registry: string,
    canonicalWorkdir: string,
    canonicalSkillsDir: string,
    base: string
) {
    const trimmed = normalizeSkillSlugOrFail(rawSlug);
    const canonicalDir = join(canonicalSkillsDir, trimmed);

    const lock = await readLockfile(canonicalWorkdir);
    const existingEntry = lock.skills[trimmed];
    if (isPinnedSkillEntry(existingEntry)) {
        fail(`skill "${trimmed}" is pinned; run \`dt-skill unpin ${trimmed}\` first`);
    }

    const spinner = createSpinner(`Resolving ${trimmed}`);
    try {
        const skillMeta = await apiRequest<ApiV1SkillResponse>(
            registry,
            { method: 'GET', path: `${ApiRoutes.skills}/${encodeURIComponent(trimmed)}` },
            ApiV1SkillResponseSchema
        );

        if (skillMeta.moderation?.isMalwareBlocked) {
            spinner.fail(`Blocked: ${trimmed} is flagged as malicious`);
            fail('This skill has been flagged as malware and cannot be installed.');
        }

        // Package: prompt sub-skills, then install each to canonical + link.
        if (skillMeta.skill && skillMeta.skill.isPackage) {
            spinner.stop();
            const children = skillMeta.skill.children ?? [];
            if (children.length === 0) {
                fail(`Skill package "${trimmed}" has no children skills.`);
            }

            const items = children.map((c) => ({
                value: c.slug,
                label: c.displayName || c.slug,
                hint: c.summary || undefined,
            }));

            let selectedSlugs: string[] | symbol;
            if (opts.yes) {
                selectedSlugs = children.map((c) => c.slug);
            } else {
                selectedSlugs = await searchMultiselect({
                    message: `Select skills from package "${trimmed}" to install:`,
                    items,
                    required: true,
                });
            }

            if (
                selectedSlugs === cancelSymbol ||
                !Array.isArray(selectedSlugs) ||
                selectedSlugs.length === 0
            ) {
                console.log('Installation cancelled');
                return;
            }

            // Summary + confirm for the chosen sub-skills.
            if (!opts.yes && isInteractive()) {
                const lines: string[] = [];
                for (const subSlug of selectedSlugs) {
                    if (lines.length > 0) lines.push('');
                    lines.push(
                        getCanonicalPath(subSlug, {
                            global: targets.global,
                            cwd: targets.global ? undefined : base,
                        })
                    );
                    lines.push(...buildAgentSummaryLines(targets.agents, targets.mode));
                }
                noteSummary(lines, 'Installation Summary');
                const confirmed = await promptConfirm('Proceed with installation?');
                if (!confirmed) {
                    console.log('Installation cancelled');
                    return;
                }
            }

            for (const subSlug of selectedSlugs) {
                const subSkill = children.find((c) => c.slug === subSlug);
                const subVersion = String(subSkill?.version || '') || 'latest';
                const subCanonical = join(canonicalSkillsDir, subSlug);

                if (!force) {
                    const exists = await fileExists(subCanonical);
                    if (exists) {
                        console.log(
                            `Already installed: ${subCanonical} (skipping, use --force to overwrite)`
                        );
                        continue;
                    }
                } else {
                    await rm(subCanonical, { recursive: true, force: true });
                }

                const subSpinner = createSpinner(`Installing sub-skill ${subSlug}@${subVersion}`);
                try {
                    await installExtractedSkill(
                        {
                            slug: subSlug,
                            version: subVersion,
                            canonicalDir: subCanonical,
                            canonicalWorkdir,
                            targets,
                            registry,
                            base,
                            lock,
                            existingEntry: lock.skills[subSlug],
                            spinner: subSpinner,
                        },
                        { downloadZip }
                    );
                    subSpinner.succeed(`OK. Installed sub-skill ${subSlug} -> ${subCanonical}`);
                } catch (err) {
                    subSpinner.fail(`Failed to install sub-skill ${subSlug}: ${formatError(err)}`);
                    throw err;
                }
            }
            return;
        }

        if (!force) {
            const exists = await fileExists(canonicalDir);
            if (exists) fail(`Already installed: ${canonicalDir} (use --force)`);
        }

        await checkSuspiciousModeration(skillMeta.moderation, trimmed, force, isInteractive(), () =>
            spinner.start(`Resolving ${trimmed}`)
        );

        const resolvedVersion = versionFlag ?? skillMeta.latestVersion?.version ?? 'latest';

        if (versionFlag) {
            await verifyVersion(registry, trimmed, resolvedVersion);
        }

        if (force) {
            await rm(canonicalDir, { recursive: true, force: true });
        }

        await installExtractedSkill(
            {
                slug: trimmed,
                version: resolvedVersion,
                canonicalDir,
                canonicalWorkdir,
                targets,
                registry,
                base,
                lock,
                existingEntry,
                spinner,
            },
            { downloadZip }
        );
        spinner.succeed(`OK. Installed ${trimmed} -> ${canonicalDir}`);
    } catch (error) {
        spinner.fail(formatError(error));
        throw error;
    }
}

/** Update lives in its own module (hash-only sync). */
export { cmdUpdate } from './update.js';

export async function cmdList(opts: GlobalOpts) {
    const installWorkdir = opts.workdir;
    const installDir = opts.dir;

    const lock = await readLockfile(installWorkdir);
    const entries = Object.entries(lock.skills);
    const manualSkills = await listManualSkills(installDir, new Set(Object.keys(lock.skills)));
    console.log(`Skills (${installDir}):`);
    if (entries.length === 0 && manualSkills.length === 0) {
        console.log('No installed skills.');
        return;
    }
    for (const [slug, entry] of entries) {
        const pinned = isPinnedSkillEntry(entry) ? `  pinned${formatPinnedDetails(entry)}` : '';
        console.log(`${slug}  ${entry.version ?? 'latest'}${pinned}`);
    }
    if (manualSkills.length > 0) {
        if (entries.length > 0) console.log();
        console.log('Manually installed (not tracked by dt-skill):');
        for (const slug of manualSkills) {
            console.log(`  ${slug}`);
        }
    }
}

export async function cmdPin(opts: GlobalOpts, slug: string, options: { reason?: string } = {}) {
    const trimmed = normalizeSkillSlugOrFail(slug);
    const lock = await readLockfile(opts.workdir);
    const existing = lock.skills[trimmed];
    if (!existing) fail(`Not installed: ${trimmed}`);

    const reason = options.reason?.trim() || existing.pinReason;
    if (isPinnedSkillEntry(existing) && reason === existing.pinReason) {
        console.log(`Skill "${trimmed}" is already pinned${reason ? `: ${reason}` : ''}`);
        return;
    }

    lock.skills[trimmed] = {
        ...existing,
        pinned: true,
        ...(reason ? { pinReason: reason } : {}),
    };
    await writeLockfile(opts.workdir, lock);
    console.log(`Pinned ${trimmed}${reason ? `: ${reason}` : ''}`);
}

export async function cmdUnpin(opts: GlobalOpts, slug: string) {
    const trimmed = normalizeSkillSlugOrFail(slug);
    const lock = await readLockfile(opts.workdir);
    const existing = lock.skills[trimmed];
    if (!existing) fail(`Not installed: ${trimmed}`);
    if (!isPinnedSkillEntry(existing)) fail(`Skill "${trimmed}" is not pinned`);

    lock.skills[trimmed] = {
        version: existing.version,
        installedAt: existing.installedAt,
    };
    await writeLockfile(opts.workdir, lock);
    console.log(`Unpinned ${trimmed}`);
}

export async function cmdUninstall(
    opts: GlobalOpts,
    slug: string,
    options: { yes?: boolean } = {},
    inputAllowed: boolean
) {
    const trimmed = normalizeSkillSlugOrFail(slug);

    const installWorkdir = opts.workdir;
    const installDir = opts.dir;
    const base = opts.globalScope ? homedir() : projectBase(opts);

    const lock = await readLockfile(installWorkdir);
    if (!lock.skills[trimmed]) {
        fail(`Not installed: ${trimmed}`);
    }

    const allowPrompt = isInteractive() && inputAllowed;
    if (!options.yes) {
        if (!allowPrompt) fail('Pass --yes (no input)');
        const confirm = await promptConfirm(`Uninstall ${trimmed}?`);
        if (!confirm) {
            console.log('Cancelled.');
            return;
        }
    }

    const spinner = createSpinner(`Uninstalling ${trimmed}`);
    try {
        const target = join(installDir, trimmed);

        await rm(target, { recursive: true, force: true });

        // Best-effort: remove per-agent symlinks/copies pointing at the canonical dir.
        await removeAgentLinks(trimmed, opts.globalScope ?? false, base);

        delete lock.skills[trimmed];
        await writeLockfile(installWorkdir, lock);

        spinner.succeed(`Uninstalled ${trimmed}`);
    } catch (error) {
        spinner.fail(formatError(error));
        throw error;
    }
}

/** Remove per-agent symlink/copy entries for a skill whose canonical dir was just removed. */
async function removeAgentLinks(slug: string, global: boolean, base: string) {
    const agentTypes = Object.keys(AGENT_DEFINITIONS) as AgentType[];
    await Promise.all(
        agentTypes.map(async (agent) => {
            const config = AGENT_DEFINITIONS[agent];
            if (config.skillsDir === '.agents/skills') return; // universal — lives in canonical
            const agentDir = global ? config.globalSkillsDir ?? null : join(base, config.skillsDir);
            if (!agentDir) return;
            const linkPath = join(agentDir, slug);
            try {
                await lstat(linkPath);
            } catch {
                return; // nothing to remove
            }
            await rm(linkPath, { recursive: true, force: true }).catch(() => {});
        })
    );
}

type ExploreSort = 'newest' | 'downloads' | 'rating' | 'installs' | 'installsAllTime' | 'trending';
type ApiExploreSort =
    | 'createdAt'
    | 'updated'
    | 'downloads'
    | 'stars'
    | 'installsCurrent'
    | 'installsAllTime'
    | 'trending';

export async function cmdExplore(
    opts: GlobalOpts,
    options: { limit?: number; sort?: string; json?: boolean } = {}
) {
    const registry = await getRegistry(opts, { cache: true });
    const spinner = createSpinner('Fetching latest skills');
    try {
        const url = registryUrl(ApiRoutes.skills, registry);
        const boundedLimit = clampLimit(options.limit ?? 25);
        const { apiSort } = resolveExploreSort(options.sort);
        url.searchParams.set('limit', String(boundedLimit));
        if (apiSort !== 'updated') url.searchParams.set('sort', apiSort);
        const result = await apiRequest<ApiV1SkillListResponse>(
            registry,
            { method: 'GET', url: url.toString() },
            ApiV1SkillListResponseSchema
        );

        spinner.stop();
        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        if (result.items.length === 0) {
            console.log('No skills found.');
            return;
        }

        for (const item of result.items) {
            console.log(formatExploreLine(item));
        }
    } catch (error) {
        spinner.fail(formatError(error));
        throw error;
    }
}

export function formatExploreLine(item: {
    slug: string;
    summary?: string | null;
    updatedAt: number;
    latestVersion?: { version: string } | null;
}) {
    const version = item.latestVersion?.version ?? '?';
    const age = formatRelativeTime(item.updatedAt);
    const summary = item.summary ? `  ${truncate(item.summary, 50)}` : '';
    return `${item.slug}  v${version}  ${age}${summary}`;
}

export function clampLimit(limit: number, fallback = 25) {
    if (!Number.isFinite(limit)) return fallback;
    return Math.min(Math.max(1, limit), 200);
}

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) {
        const months = Math.floor(days / 30);
        return `${months}mo ago`;
    }
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
}

function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return `${str.slice(0, maxLen - 1)}…`;
}

function resolveExploreSort(raw?: string): { sort: ExploreSort; apiSort: ApiExploreSort } {
    const normalized = raw?.trim().toLowerCase();
    if (
        !normalized ||
        normalized === 'newest' ||
        normalized === 'createdat' ||
        normalized === 'created-at'
    ) {
        return { sort: 'newest', apiSort: 'createdAt' };
    }
    if (normalized === 'updated') {
        return { sort: 'newest', apiSort: 'updated' };
    }
    if (normalized === 'downloads' || normalized === 'download') {
        return { sort: 'downloads', apiSort: 'downloads' };
    }
    if (normalized === 'rating' || normalized === 'stars' || normalized === 'star') {
        return { sort: 'rating', apiSort: 'stars' };
    }
    if (
        normalized === 'installs' ||
        normalized === 'install' ||
        normalized === 'installscurrent' ||
        normalized === 'installs-current' ||
        normalized === 'current'
    ) {
        return { sort: 'installs', apiSort: 'installsCurrent' };
    }
    if (normalized === 'installsalltime' || normalized === 'installs-all-time') {
        return { sort: 'installsAllTime', apiSort: 'installsAllTime' };
    }
    if (normalized === 'trending') {
        return { sort: 'trending', apiSort: 'trending' };
    }
    return fail(
        `Invalid sort "${raw}". Use newest, updated, downloads, rating, installs, installsAllTime, or trending.`
    );
}
