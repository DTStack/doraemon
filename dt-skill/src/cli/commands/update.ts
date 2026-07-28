import { join } from 'node:path';
import { rm } from 'node:fs/promises';
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
import {
    hashSkillFiles,
    listTextFiles,
    readSkillOrigin,
    writeSkillOrigin,
} from '../../skills.js';
import { getRegistry } from '../registry.js';
import { decideSkillSync, remoteCurrentFromDetail } from '../skillSync.js';
import type { GlobalOpts } from '../types.js';
import {
    createSpinner,
    fail,
    formatError,
    isInteractive,
    promptConfirm,
} from '../ui.js';
import {
    fileExists,
    isSafeSkillSlug,
    normalizeSkillSlugOrFail,
    prepareSkillUpdate,
    replaceSkillDirectory,
} from './skillHelpers.js';

/**
 * Update installed skills by content hash (main path).
 * No resolve API — remote identity is skill.fingerprint from detail.
 */
export async function cmdUpdate(
    opts: GlobalOpts,
    slugArg: string | undefined,
    options: { all?: boolean; version?: string; force?: boolean },
    inputAllowed: boolean
) {
    const slug = slugArg ? normalizeSkillSlugOrFail(slugArg) : undefined;
    if (slug && options.all) fail('Use either <slug> or --all');
    if (options.version && !slug) fail('--version requires a single <slug>');
    if (options.version && !semver.valid(options.version)) fail('--version must be valid semver');

    const installWorkdir = opts.workdir;
    const installDir = opts.dir;

    const lock = await readLockfile(installWorkdir);
    if (slug && isPinnedSkillEntry(lock.skills[slug])) {
        fail(`skill "${slug}" is pinned; run \`dt-skill unpin ${slug}\` first`);
    }
    const allowPrompt = isInteractive() && inputAllowed;

    const registry = await getRegistry(opts, { cache: true });
    const requestedSlugs = slug ? [slug] : Object.keys(lock.skills).filter(isSafeSkillSlug);
    const skippedPinned = slug
        ? []
        : requestedSlugs.filter((entry) => isPinnedSkillEntry(lock.skills[entry]));
    const slugs = slug
        ? requestedSlugs
        : requestedSlugs.filter((entry) => !isPinnedSkillEntry(lock.skills[entry]));

    if (slugs.length === 0) {
        if (skippedPinned.length > 0) {
            const suffix = skippedPinned.length === 1 ? '' : 's';
            console.log(
                `Skipped ${skippedPinned.length} pinned skill${suffix}: ${skippedPinned.join(', ')}`
            );
            return;
        }
        console.log('No installed skills.');
        return;
    }

    const updated: string[] = [];
    const alreadyCurrent: string[] = [];
    const failed: Array<{ slug: string; error: string }> = [];
    let lockDirty = false;

    for (const entry of slugs) {
        const spinner = createSpinner(`Checking ${entry}`);
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
                    spinner.start(`Checking ${entry}`);
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
                    await writeLockfile(installWorkdir, lock);
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

            // decision.action === 'update'
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
            await writeLockfile(installWorkdir, lock);
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
            console.log(`  failed ${item.slug}: ${item.error}`);
        }
        fail(`Failed to update ${failed.length} skill(s)`);
    }
}
