import { readdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import semver from 'semver';

import { apiRequest, downloadZip } from '../../http.js';
import {
    isPinned as isPinnedSkillEntry,
    readLockfile,
    withPinnedMetadata,
    writeLockfile,
} from '../../lockfile.js';
import {
    ApiRoutes,
    type ApiV1SkillResponse,
    ApiV1SkillResponseSchema,
} from '../../schema/index.js';
import { hashSkillFiles, listTextFiles, readSkillOrigin, writeSkillOrigin } from '../../skills.js';
import { getRegistry } from '../registry.js';
import { decideSkillSync, remoteCurrentFromDetail } from '../skillSync.js';
import type { GlobalOpts } from '../types.js';
import {
    createSpinner,
    fail,
    formatError,
    isInteractive,
    promptConfirm,
    selectUpdateScope,
    type UpdateScopeChoice,
} from '../ui.js';
import {
    fileExists,
    isSafeSkillSlug,
    normalizeSkillSlugOrFail,
    prepareSkillUpdate,
    replaceSkillDirectory,
} from './skillHelpers.js';

export type UpdateScopeOptions = {
    all?: boolean;
    version?: string;
    force?: boolean;
    /** -g / --global */
    global?: boolean;
    /** -p / --project */
    project?: boolean;
    /** -y or non-interactive: skip scope prompt */
    yes?: boolean;
};

type AgentsRoot = { workdir: string; dir: string };

type ScopeRoots = {
    project: AgentsRoot;
    global: AgentsRoot;
};

/**
 * Whether the project domain looks occupied (vercel hasProjectSkills spirit).
 * true if project lock file exists OR any skills dir has a SKILL.md child.
 */
export async function hasProjectSkills(projectWorkdir: string): Promise<boolean> {
    const lockPath = join(projectWorkdir, '.dt-skill', 'lock.json');
    if (await fileExists(lockPath)) return true;

    const skillsDir = join(projectWorkdir, 'skills');
    try {
        const entries = await readdir(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (await fileExists(join(skillsDir, entry.name, 'SKILL.md'))) {
                return true;
            }
        }
    } catch {
        // missing skills dir
    }
    return false;
}

/** Project + global agents roots for update. */
export function getUpdateScopeRoots(opts: GlobalOpts): ScopeRoots {
    const globalWorkdir = join(homedir(), '.agents');
    const globalDir = join(globalWorkdir, 'skills');

    if (opts.globalScope) {
        // opts.workdir is ~/.agents; project agents root from cwd
        const projectWorkdir = join(resolve(process.cwd()), '.agents');
        return {
            project: { workdir: projectWorkdir, dir: join(projectWorkdir, 'skills') },
            global: { workdir: opts.workdir, dir: opts.dir },
        };
    }

    return {
        project: { workdir: opts.workdir, dir: opts.dir },
        global: { workdir: globalWorkdir, dir: globalDir },
    };
}

/**
 * Resolve update scope (vercel-labs/skills resolveUpdateScope).
 * hasSkillNames = positional slug present.
 * Returns null if the user cancels the interactive prompt.
 */
export async function resolveUpdateScope(
    options: UpdateScopeOptions,
    ctx: { inputAllowed: boolean; projectWorkdir: string; hasSkillNames: boolean }
): Promise<UpdateScopeChoice | null> {
    const g = Boolean(options.global);
    const p = Boolean(options.project);

    if (ctx.hasSkillNames) {
        if (g && !p) return 'global';
        if (p && !g) return 'project';
        if (g && p) return 'both';
        return 'both';
    }

    if (g && p) return 'both';
    if (g) return 'global';
    if (p) return 'project';

    const skipPrompt = Boolean(options.yes) || !isInteractive() || !ctx.inputAllowed;
    if (skipPrompt) {
        return (await hasProjectSkills(ctx.projectWorkdir)) ? 'project' : 'global';
    }

    const picked = await selectUpdateScope();
    if (picked === null) {
        console.log('Update cancelled');
        return null;
    }
    return picked;
}

/**
 * Update installed skills by content hash.
 * Scope selection matches vercel; remote identity is skill.fingerprint.
 */
export async function cmdUpdate(
    opts: GlobalOpts,
    slugArg: string | undefined,
    options: UpdateScopeOptions,
    inputAllowed: boolean
) {
    const slug = slugArg ? normalizeSkillSlugOrFail(slugArg) : undefined;
    if (slug && options.all) fail('Use either <slug> or --all');
    if (options.version && !slug) fail('--version requires a single <slug>');
    if (options.version && !semver.valid(options.version)) fail('--version must be valid semver');

    const roots = getUpdateScopeRoots(opts);
    const scope = await resolveUpdateScope(options, {
        inputAllowed,
        projectWorkdir: roots.project.workdir,
        hasSkillNames: Boolean(slug),
    });
    if (scope === null) return;

    const scopesToRun: Array<'project' | 'global'> =
        scope === 'both' ? ['project', 'global'] : [scope];

    const updated: string[] = [];
    const alreadyCurrent: string[] = [];
    const skippedPinned: string[] = [];
    const failed: Array<{ slug: string; error: string; scope: string }> = [];

    const registry = await getRegistry(opts, { cache: true });
    const allowPrompt = isInteractive() && inputAllowed && !options.yes;

    for (const scopeLabel of scopesToRun) {
        const { workdir, dir } = roots[scopeLabel];
        const result = await updateSkillsInOneScope({
            installWorkdir: workdir,
            installDir: dir,
            scopeLabel,
            multiScope: scopesToRun.length > 1,
            slug,
            options,
            registry,
            allowPrompt,
        });
        const tag = (s: string) => (scopesToRun.length > 1 ? `${s} (${scopeLabel})` : s);
        updated.push(...result.updated.map(tag));
        alreadyCurrent.push(...result.alreadyCurrent.map(tag));
        skippedPinned.push(...result.skippedPinned.map(tag));
        for (const f of result.failed) {
            failed.push({ ...f, scope: scopeLabel });
        }
    }

    if (
        slug &&
        updated.length === 0 &&
        alreadyCurrent.length === 0 &&
        skippedPinned.length === 0 &&
        failed.length === 0
    ) {
        failed.push({ slug, error: 'not found', scope: scope === 'both' ? 'both' : scope });
    }

    if (
        !slug &&
        updated.length === 0 &&
        alreadyCurrent.length === 0 &&
        skippedPinned.length === 0 &&
        failed.length === 0
    ) {
        console.log('No installed skills.');
        return;
    }

    if (skippedPinned.length > 0 && updated.length === 0 && alreadyCurrent.length === 0 && !slug) {
        // only pins in scope(s)
        console.log(
            `Skipped ${skippedPinned.length} pinned skill(s): ${skippedPinned.join(', ')}`
        );
        // still print summary below
    }

    console.log('');
    console.log(
        `Update summary: ${updated.length} updated, ${alreadyCurrent.length} up to date, ${skippedPinned.length} pinned skipped, ${failed.length} failed`
    );
    if (updated.length > 0) console.log(`  updated: ${updated.join(', ')}`);
    if (alreadyCurrent.length > 0) console.log(`  up to date: ${alreadyCurrent.join(', ')}`);
    if (skippedPinned.length > 0) {
        console.log(`  pinned skipped: ${skippedPinned.join(', ')}`);
    }
    if (failed.length > 0) {
        for (const item of failed) {
            const scopeTag = scopesToRun.length > 1 ? ` [${item.scope}]` : '';
            console.log(`  failed ${item.slug}${scopeTag}: ${item.error}`);
        }
        fail(`Failed to update ${failed.length} skill(s)`);
    }
}

async function updateSkillsInOneScope(args: {
    installWorkdir: string;
    installDir: string;
    scopeLabel: string;
    multiScope: boolean;
    slug: string | undefined;
    options: UpdateScopeOptions;
    registry: string;
    allowPrompt: boolean;
}): Promise<{
    updated: string[];
    alreadyCurrent: string[];
    skippedPinned: string[];
    failed: Array<{ slug: string; error: string }>;
}> {
    const {
        installWorkdir,
        installDir,
        slug,
        options,
        registry,
        allowPrompt,
        scopeLabel,
        multiScope,
    } = args;

    const lock = await readLockfile(installWorkdir);

    if (slug && isPinnedSkillEntry(lock.skills[slug])) {
        fail(`skill "${slug}" is pinned; run \`dt-skill unpin ${slug}\` first`);
    }

    // Named skill absent from this scope → no-op for this scope
    if (slug) {
        const onDisk = await fileExists(join(installDir, slug));
        if (!lock.skills[slug] && !onDisk) {
            return { updated: [], alreadyCurrent: [], skippedPinned: [], failed: [] };
        }
    }

    const requestedSlugs = slug ? [slug] : Object.keys(lock.skills).filter(isSafeSkillSlug);
    const skippedPinned = slug
        ? []
        : requestedSlugs.filter((entry) => isPinnedSkillEntry(lock.skills[entry]));
    const slugs = slug
        ? requestedSlugs
        : requestedSlugs.filter((entry) => !isPinnedSkillEntry(lock.skills[entry]));

    if (slugs.length === 0) {
        return { updated: [], alreadyCurrent: [], skippedPinned, failed: [] };
    }

    const updated: string[] = [];
    const alreadyCurrent: string[] = [];
    const failed: Array<{ slug: string; error: string }> = [];
    let lockDirty = false;
    const checkLabel = multiScope ? `Checking ${scopeLabel}` : 'Checking';

    for (const entry of slugs) {
        const spinner = createSpinner(`${checkLabel} ${entry}`);
        try {
            const target = join(installDir, entry);
            const exists = await fileExists(target);
            const existingOrigin = exists ? await readSkillOrigin(target) : null;

            const skillMeta = await apiRequest<ApiV1SkillResponse>(
                registry,
                { method: 'GET', path: `${ApiRoutes.skills}/${encodeURIComponent(entry)}` },
                ApiV1SkillResponseSchema
            );

            if (skillMeta.moderation?.isMalwareBlocked) {
                spinner.fail(`${entry}: blocked as malicious`);
                console.log('   This skill has been flagged as malware and cannot be updated.');
                failed.push({ slug: entry, error: 'blocked as malicious' });
                continue;
            }

            if (skillMeta.moderation?.isSuspicious && !options.force) {
                spinner.stop();
                console.log(
                    `\n⚠️  Warning: "${entry}" is flagged for ClawHub security review.\n` +
                        '   This skill may contain risky patterns (crypto keys, external APIs, eval, etc.)\n'
                );
                if (allowPrompt) {
                    const confirm = await promptConfirm('Update anyway?');
                    if (!confirm) {
                        console.log(`${entry}: skipped`);
                        continue;
                    }
                    spinner.start(`${checkLabel} ${entry}`);
                } else {
                    console.log(`${entry}: skipped (use --force to update suspicious skills)`);
                    continue;
                }
            }

            let localFingerprint: string | null = null;
            if (exists) {
                const filesOnDisk = await listTextFiles(target);
                if (filesOnDisk.length > 0) {
                    localFingerprint = hashSkillFiles(filesOnDisk).fingerprint;
                }
            }
            if (!localFingerprint && lock.skills[entry]?.fingerprint) {
                localFingerprint = lock.skills[entry].fingerprint ?? null;
            }

            const remote = remoteCurrentFromDetail(skillMeta);
            const decision = decideSkillSync({
                localFingerprint,
                remote,
                explicitVersion: options.version,
            });

            if (decision.action === 'missing') {
                spinner.fail(`${entry}: not found`);
                failed.push({ slug: entry, error: 'not found' });
                continue;
            }

            if (decision.action === 'up_to_date') {
                const prev = lock.skills[entry];
                const needsLockWrite =
                    prev?.version !== decision.version ||
                    (decision.fingerprint != null && prev?.fingerprint !== decision.fingerprint);
                if (needsLockWrite) {
                    lock.skills[entry] = withPinnedMetadata(
                        decision.version,
                        prev?.installedAt ?? Date.now(),
                        prev,
                        decision.fingerprint
                    );
                    lockDirty = true;
                }
                spinner.succeed(
                    `${entry}: up to date${
                        decision.fingerprint
                            ? ` (${decision.fingerprint.slice(0, 12)}…)`
                            : ` (${decision.version})`
                    }`
                );
                alreadyCurrent.push(entry);
                continue;
            }

            const targetVersion = decision.version;
            if (spinner.isSpinning) {
                spinner.text = `Updating ${entry}`;
            } else {
                spinner.start(`Updating ${entry}`);
            }

            const zip = await downloadZip(registry, {
                slug: entry,
                version: targetVersion,
            });
            const preparedDir = await prepareSkillUpdate(zip, target);

            try {
                const installedFiles = await listTextFiles(preparedDir);
                const installedFingerprint =
                    installedFiles.length > 0
                        ? hashSkillFiles(installedFiles).fingerprint
                        : undefined;
                await writeSkillOrigin(preparedDir, {
                    version: 1,
                    registry: existingOrigin?.registry ?? registry,
                    slug: existingOrigin?.slug ?? entry,
                    installedVersion: targetVersion,
                    installedAt: existingOrigin?.installedAt ?? Date.now(),
                    fingerprint: installedFingerprint,
                });
                await replaceSkillDirectory(preparedDir, target, exists);
                lock.skills[entry] = withPinnedMetadata(
                    targetVersion,
                    Date.now(),
                    lock.skills[entry],
                    installedFingerprint
                );
            } catch (error) {
                await rm(preparedDir, { recursive: true, force: true }).catch(() => {});
                throw error;
            }

            lockDirty = true;
            spinner.succeed(
                `${entry}: updated${
                    lock.skills[entry]?.fingerprint
                        ? ` hash=${lock.skills[entry].fingerprint!.slice(0, 12)}…`
                        : ` -> ${targetVersion}`
                }`
            );
            updated.push(entry);
        } catch (error) {
            spinner.fail(formatError(error));
            failed.push({ slug: entry, error: formatError(error) });
        }
    }

    if (lockDirty) {
        await writeLockfile(installWorkdir, lock);
    }

    return { updated, alreadyCurrent, skippedPinned, failed };
}
