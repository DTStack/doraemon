import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import semver from "semver";
import { apiRequest, downloadZip, registryUrl } from "../../http.js";
import {
  ApiRoutes,
  ApiV1SearchResponseSchema,
  ApiV1SkillListResponseSchema,
  ApiV1SkillResolveResponseSchema,
  ApiV1SkillResponseSchema,
  ApiV1SkillVersionResponseSchema,
  type ApiV1SearchResponse,
  type ApiV1SkillListResponse,
  type ApiV1SkillResponse,
  type ApiV1SkillResolveResponse,
} from "../../schema/index.js";
import {
  extractZipToDir,
  hashSkillFiles,
  listManualSkills,
  listTextFiles,
  readLockfile,
  readSkillOrigin,
  writeLockfile,
  writeSkillOrigin,
} from "../../skills.js";
import { getRegistry } from "../registry.js";
import type { GlobalOpts, ResolveResult } from "../types.js";
import {
  createSpinner,
  fail,
  formatError,
  isInteractive,
  promptConfirm,
  selectAgent,
  selectScope,
} from "../ui.js";
import { searchMultiselect, cancelSymbol } from "../prompts/search-multiselect.js";
import { getAgentLabel, resolveAgentWorkdir } from "../agents.js";
import type { AgentName } from "../agents.js";

function normalizeSkillSlugOrFail(raw: string) {
  const slug = raw.trim();
  if (!slug) fail("Slug required");
  // Safety: never allow path traversal or nested paths to become filesystem operations.
  if (slug.includes("/") || slug.includes("\\") || slug.includes("..")) {
    fail(`Invalid slug: ${slug}`);
  }
  return slug;
}

function isSafeSkillSlug(slug: string) {
  return Boolean(slug) && !slug.includes("/") && !slug.includes("\\") && !slug.includes("..");
}

function isPinnedSkillEntry(entry?: { pinned?: boolean | null }) {
  return entry?.pinned === true;
}

function withPinnedMetadata(
  version: string | null,
  installedAt: number,
  existing?: { pinned?: boolean; pinReason?: string },
) {
  return {
    version,
    installedAt,
    ...(existing?.pinned ? { pinned: true } : {}),
    ...(existing?.pinned && existing.pinReason ? { pinReason: existing.pinReason } : {}),
  };
}

function formatPinnedDetails(entry?: { pinReason?: string }) {
  return entry?.pinReason ? ` (${entry.pinReason})` : "";
}

function formatSearchOwner(entry: {
  ownerHandle?: string | null;
  owner?: { handle?: string | null; displayName?: string | null } | null;
}) {
  const handle = entry.ownerHandle ?? entry.owner?.handle;
  if (handle) return `@${handle}`;
  return entry.owner?.displayName ?? "unknown owner";
}

export async function cmdSearch(opts: GlobalOpts, query: string, limit?: number) {
  if (!query) fail("Query required");

  const registry = await getRegistry(opts, { cache: true });
  const spinner = createSpinner("Searching");
  try {
    const url = registryUrl(ApiRoutes.search, registry);
    url.searchParams.set("q", query);
    const effectiveLimit = typeof limit === "number" && Number.isFinite(limit) ? limit : 25;
    url.searchParams.set("limit", String(effectiveLimit));
    const result = await apiRequest<ApiV1SearchResponse>(
      registry,
      { method: "GET", url: url.toString() },
      ApiV1SearchResponseSchema,
    );

    spinner.stop();
    for (const entry of result.results) {
      const slug = entry.slug ?? "unknown";
      const name = entry.displayName ?? slug;
      const version = entry.version ? ` v${entry.version}` : "";
      console.log(
        `${slug}${version}  ${formatSearchOwner(entry)}  ${name}  (${entry.score.toFixed(3)})`,
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
  force = false,
) {
  if (Array.isArray(rawSlug)) {
    let batchOpts = opts;
    if (!opts.agent && isInteractive()) {
      const picked = await selectAgent();
      if (picked) {
        batchOpts = { ...opts, agent: picked.agent, workdir: picked.workdir, dir: picked.dir };
      }
    }

    // Scope selection for batch install (copied from vercel-labs/skills)
    if (batchOpts.agent && !batchOpts.globalScopeExplicit && isInteractive()) {
      const scope = await selectScope(batchOpts.agent as AgentName);
      if (scope === null) {
        console.log("Installation cancelled");
        return;
      }
      if (scope) {
        const workdir = resolveAgentWorkdir(batchOpts.agent as AgentName, true);
        batchOpts = { ...batchOpts, workdir, dir: `${workdir}/skills`, globalScope: true, globalScopeExplicit: true };
      } else {
        batchOpts = { ...batchOpts, globalScope: false, globalScopeExplicit: true };
      }
    }

    const results: { slug: string; status: 'ok' | 'fail' }[] = [];
    for (const slug of rawSlug) {
      try {
        await cmdInstall(batchOpts, slug, versionFlag, force);
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
    return;
  }

  const trimmed = normalizeSkillSlugOrFail(rawSlug);

  // Prompt for target agent when --agent is not provided and interactive
  let installWorkdir = opts.workdir;
  let installDir = opts.dir;
  let installAgent = opts.agent;
  if (!opts.agent && isInteractive()) {
    const picked = await selectAgent();
    if (picked) {
      installWorkdir = picked.workdir;
      installDir = picked.dir;
      installAgent = picked.agent;
    }
  }

  // Scope selection (copied from vercel-labs/skills)
  if (installAgent && !opts.globalScopeExplicit && isInteractive()) {
    const scope = await selectScope(installAgent as AgentName);
    if (scope === null) {
      console.log("Installation cancelled");
      return;
    }
    if (scope) {
      installWorkdir = resolveAgentWorkdir(installAgent as AgentName, true);
      installDir = `${installWorkdir}/skills`;
    }
  }

  const registry = await getRegistry(opts, { cache: true });
  await mkdir(installDir, { recursive: true });
  const target = join(installDir, trimmed);

  const lock = await readLockfile(installWorkdir);
  const existingEntry = lock.skills[trimmed];
  if (isPinnedSkillEntry(existingEntry)) {
    fail(`skill "${trimmed}" is pinned; run \`clawhub unpin ${trimmed}\` first`);
  }

  const spinner = createSpinner(`Resolving ${trimmed}`);
  try {
    // Fetch skill metadata including moderation status
    const skillMeta = await apiRequest<ApiV1SkillResponse>(
      registry,
      { method: "GET", path: `${ApiRoutes.skills}/${encodeURIComponent(trimmed)}` },
      ApiV1SkillResponseSchema,
    );

    // Check moderation status before proceeding
    if (skillMeta.moderation?.isMalwareBlocked) {
      spinner.fail(`Blocked: ${trimmed} is flagged as malicious`);
      fail("This skill has been flagged as malware and cannot be installed.");
    }

    if (skillMeta.skill && (skillMeta.skill as any).isPackage) {
      spinner.stop();
      const children = (skillMeta.skill as any).children || [];
      if (children.length === 0) {
        fail(`Skill package "${trimmed}" has no children skills.`);
      }

      // Prepare items for searchMultiselect
      const items = children.map((c: any) => ({
        value: c.slug,
        label: c.displayName || c.slug,
        hint: c.summary || undefined,
      }));

      const selectedSlugs = await searchMultiselect({
        message: `Select skills from package "${trimmed}" to install:`,
        items,
        required: true,
      });

      if (selectedSlugs === cancelSymbol || !Array.isArray(selectedSlugs) || selectedSlugs.length === 0) {
        console.log("Installation cancelled");
        return;
      }

      // Install each selected sub-skill
      for (const subSlug of selectedSlugs as string[]) {
        const subSkill = children.find((c: any) => c.slug === subSlug);
        const subVersion = String(subSkill?.version || "") || "latest";
        const subTarget = join(installDir, subSlug);

        if (!force) {
          const exists = await fileExists(subTarget);
          if (exists) {
            console.log(`Already installed: ${subTarget} (skipping, use --force to overwrite)`);
            continue;
          }
        } else {
          await rm(subTarget, { recursive: true, force: true });
        }

        const subSpinner = createSpinner(`Downloading sub-skill ${subSlug}@${subVersion}`);
        try {
          const zip = await downloadZip(registry, {
            slug: subSlug,
            version: subVersion,
          });
          await extractZipToDir(zip, subTarget);
          const installedFiles = await listTextFiles(subTarget);
          const installedFingerprint =
            installedFiles.length > 0 ? hashSkillFiles(installedFiles).fingerprint : undefined;

          await writeSkillOrigin(subTarget, {
            version: 1,
            registry,
            slug: subSlug,
            installedVersion: subVersion,
            installedAt: Date.now(),
            fingerprint: installedFingerprint,
          });

          lock.skills[subSlug] = withPinnedMetadata(subVersion, Date.now(), lock.skills[subSlug]);
          await writeLockfile(installWorkdir, lock);
          const agentSuffix2 = installAgent ? ` (${getAgentLabel(installAgent as import("../agents.js").AgentName)})` : "";
          subSpinner.succeed(`OK. Installed sub-skill ${subSlug} -> ${subTarget}${agentSuffix2}`);
        } catch (err) {
          subSpinner.fail(`Failed to install sub-skill ${subSlug}: ${formatError(err)}`);
          throw err;
        }
      }
      return;
    }

    if (!force) {
      const exists = await fileExists(target);
      if (exists) fail(`Already installed: ${target} (use --force)`);
    }

    if (skillMeta.moderation?.isSuspicious && !force) {
      spinner.stop();
      console.log(
        `\n⚠️  Warning: "${trimmed}" is flagged for ClawHub security review.\n` +
          "   This skill may contain risky patterns (crypto keys, external APIs, eval, etc.)\n" +
          "   Review the skill code before use.\n",
      );
      if (isInteractive()) {
        const confirm = await promptConfirm("Install anyway?");
        if (!confirm) fail("Installation cancelled");
        spinner.start(`Resolving ${trimmed}`);
      } else {
        fail("Use --force to install suspicious skills in non-interactive mode");
      }
    }

    const resolvedVersion = versionFlag ?? skillMeta.latestVersion?.version ?? "latest";

    if (versionFlag) {
      await apiRequest(
        registry,
        {
          method: "GET",
          path: `${ApiRoutes.skills}/${encodeURIComponent(trimmed)}/versions/${encodeURIComponent(
            resolvedVersion,
          )}`,
        },
        ApiV1SkillVersionResponseSchema,
      );
    }

    if (force) {
      await rm(target, { recursive: true, force: true });
    }

    spinner.text = `Downloading ${trimmed}@${resolvedVersion}`;
    const zip = await downloadZip(registry, {
      slug: trimmed,
      version: resolvedVersion,
    });
    await extractZipToDir(zip, target);
    const installedFiles = await listTextFiles(target);
    const installedFingerprint =
      installedFiles.length > 0 ? hashSkillFiles(installedFiles).fingerprint : undefined;

    await writeSkillOrigin(target, {
      version: 1,
      registry,
      slug: trimmed,
      installedVersion: resolvedVersion,
      installedAt: Date.now(),
      fingerprint: installedFingerprint,
    });

    lock.skills[trimmed] = withPinnedMetadata(resolvedVersion, Date.now(), existingEntry);
    await writeLockfile(installWorkdir, lock);
    const agentSuffix = installAgent ? ` (${getAgentLabel(installAgent as import("../agents.js").AgentName)})` : "";
    spinner.succeed(`OK. Installed ${trimmed} -> ${target}${agentSuffix}`);
  } catch (error) {
    spinner.fail(formatError(error));
    throw error;
  }
}

export async function cmdUpdate(
  opts: GlobalOpts,
  slugArg: string | undefined,
  options: { all?: boolean; version?: string; force?: boolean },
  inputAllowed: boolean,
) {
  const slug = slugArg ? normalizeSkillSlugOrFail(slugArg) : undefined;
  const all = Boolean(options.all);
  if (!slug && !all) fail("Provide <slug> or --all");
  if (slug && all) fail("Use either <slug> or --all");
  if (options.version && !slug) fail("--version requires a single <slug>");
  if (options.version && !semver.valid(options.version)) fail("--version must be valid semver");

  // Prompt for target agent when --agent is not provided and interactive
  let installWorkdir = opts.workdir;
  let installDir = opts.dir;
  let installAgent = opts.agent;
  if (!opts.agent && isInteractive()) {
    const picked = await selectAgent();
    if (picked) {
      installWorkdir = picked.workdir;
      installDir = picked.dir;
      installAgent = picked.agent;
    }
  }

  // Scope selection (copied from vercel-labs/skills)
  if (installAgent && !opts.globalScopeExplicit && isInteractive()) {
    const scope = await selectScope(installAgent as AgentName);
    if (scope === null) {
      console.log("Update cancelled");
      return;
    }
    if (scope) {
      installWorkdir = resolveAgentWorkdir(installAgent as AgentName, true);
      installDir = `${installWorkdir}/skills`;
    }
  }

  const lock = await readLockfile(installWorkdir);
  if (slug && isPinnedSkillEntry(lock.skills[slug])) {
    fail(`skill "${slug}" is pinned; run \`clawhub unpin ${slug}\` first`);
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
      const suffix = skippedPinned.length === 1 ? "" : "s";
      console.log(
        `Skipped ${skippedPinned.length} pinned skill${suffix}: ${skippedPinned.join(", ")}`,
      );
      return;
    }
    console.log("No installed skills.");
    return;
  }

  for (const entry of slugs) {
    const spinner = createSpinner(`Checking ${entry}`);
    try {
      const target = join(installDir, entry);
      const exists = await fileExists(target);
      const existingOrigin = exists ? await readSkillOrigin(target) : null;

      // Always fetch skill metadata to check moderation status
      const skillMeta = await apiRequest<ApiV1SkillResponse>(
        registry,
        { method: "GET", path: `${ApiRoutes.skills}/${encodeURIComponent(entry)}` },
        ApiV1SkillResponseSchema,
      );

      // Check moderation status before proceeding
      if (skillMeta.moderation?.isMalwareBlocked) {
        spinner.fail(`${entry}: blocked as malicious`);
        console.log("   This skill has been flagged as malware and cannot be updated.");
        continue;
      }

      if (skillMeta.moderation?.isSuspicious && !options.force) {
        spinner.stop();
        console.log(
          `\n⚠️  Warning: "${entry}" is flagged for ClawHub security review.\n` +
            "   This skill may contain risky patterns (crypto keys, external APIs, eval, etc.)\n",
        );
        if (allowPrompt) {
          const confirm = await promptConfirm("Update anyway?");
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
          const hashed = hashSkillFiles(filesOnDisk);
          localFingerprint = hashed.fingerprint;
        }
      }

      let resolveResult: ResolveResult;
      if (localFingerprint) {
        resolveResult = await resolveSkillVersion(registry, entry, localFingerprint);
      } else {
        resolveResult = { match: null, latestVersion: skillMeta.latestVersion ?? null };
      }

      const latest = resolveResult.latestVersion?.version ?? null;
      const matched =
        resolveResult.match?.version ??
        (localFingerprint &&
        existingOrigin?.fingerprint === localFingerprint &&
        existingOrigin.slug === entry
          ? existingOrigin.installedVersion
          : null);

      if (matched && lock.skills[entry]?.version !== matched) {
        lock.skills[entry] = withPinnedMetadata(
          matched,
          lock.skills[entry]?.installedAt ?? Date.now(),
          lock.skills[entry],
        );
      }

      if (!latest) {
        spinner.fail(`${entry}: not found`);
        continue;
      }

      if (!matched && localFingerprint && !options.force) {
        spinner.stop();
        if (!allowPrompt) {
          console.log(`${entry}: local changes (no match). Use --force to overwrite.`);
          continue;
        }
        const confirm = await promptConfirm(
          `${entry}: local changes (no match). Overwrite with ${options.version ?? latest}?`,
        );
        if (!confirm) {
          console.log(`${entry}: skipped`);
          continue;
        }
        spinner.start(`Updating ${entry} -> ${options.version ?? latest}`);
      }

      const targetVersion = options.version ?? latest;
      if (options.version) {
        if (matched && matched === targetVersion) {
          spinner.succeed(`${entry}: already at ${matched}`);
          continue;
        }
      } else if (matched && semver.valid(matched) && semver.gte(matched, targetVersion)) {
        spinner.succeed(`${entry}: up to date (${matched})`);
        continue;
      }

      if (spinner.isSpinning) {
        spinner.text = `Updating ${entry} -> ${targetVersion}`;
      } else {
        spinner.start(`Updating ${entry} -> ${targetVersion}`);
      }
      await rm(target, { recursive: true, force: true });
      const zip = await downloadZip(registry, {
        slug: entry,
        version: targetVersion,
      });
      await extractZipToDir(zip, target);
      const installedFiles = await listTextFiles(target);
      const installedFingerprint =
        installedFiles.length > 0 ? hashSkillFiles(installedFiles).fingerprint : undefined;

      await writeSkillOrigin(target, {
        version: 1,
        registry: existingOrigin?.registry ?? registry,
        slug: existingOrigin?.slug ?? entry,
        installedVersion: targetVersion,
        installedAt: existingOrigin?.installedAt ?? Date.now(),
        fingerprint: installedFingerprint,
      });

      lock.skills[entry] = withPinnedMetadata(targetVersion, Date.now(), lock.skills[entry]);
      const agentSuffix3 = installAgent ? ` (${getAgentLabel(installAgent as import("../agents.js").AgentName)})` : "";
      spinner.succeed(`${entry}: updated -> ${targetVersion}${agentSuffix3}`);
    } catch (error) {
      spinner.fail(formatError(error));
      throw error;
    }
  }

  await writeLockfile(installWorkdir, lock);
  if (skippedPinned.length > 0) {
    const suffix = skippedPinned.length === 1 ? "" : "s";
    console.log(
      `Skipped ${skippedPinned.length} pinned skill${suffix}: ${skippedPinned.join(", ")}`,
    );
  }
}

export async function cmdList(opts: GlobalOpts) {
  // Prompt for target agent when --agent is not provided and interactive
  let installWorkdir = opts.workdir;
  let installDir = opts.dir;
  let installAgent = opts.agent;
  if (!opts.agent && isInteractive()) {
    const picked = await selectAgent();
    if (picked) {
      installWorkdir = picked.workdir;
      installDir = picked.dir;
      installAgent = picked.agent;
    }
  }

  // Scope selection (copied from vercel-labs/skills)
  if (installAgent && !opts.globalScopeExplicit && isInteractive()) {
    const scope = await selectScope(installAgent as AgentName);
    if (scope === null) {
      console.log("List cancelled");
      return;
    }
    if (scope) {
      installWorkdir = resolveAgentWorkdir(installAgent as AgentName, true);
      installDir = `${installWorkdir}/skills`;
    }
  }

  const lock = await readLockfile(installWorkdir);
  const entries = Object.entries(lock.skills);
  const manualSkills = await listManualSkills(installDir, new Set(Object.keys(lock.skills)));
  if (installAgent) {
    console.log(`Skills for ${getAgentLabel(installAgent as import("../agents.js").AgentName)} (${installDir}):`);
  }
  if (entries.length === 0 && manualSkills.length === 0) {
    console.log("No installed skills.");
    return;
  }
  for (const [slug, entry] of entries) {
    const e = entry as { version?: string | null; pinned?: boolean; pinReason?: string };
    const pinned = isPinnedSkillEntry(e) ? `  pinned${formatPinnedDetails(e)}` : "";
    console.log(`${slug}  ${e.version ?? "latest"}${pinned}`);
  }
  if (manualSkills.length > 0) {
    if (entries.length > 0) console.log();
    console.log("Manually installed (not tracked by clawhub):");
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
    console.log(`Skill "${trimmed}" is already pinned${reason ? `: ${reason}` : ""}`);
    return;
  }

  lock.skills[trimmed] = {
    ...existing,
    pinned: true,
    ...(reason ? { pinReason: reason } : {}),
  };
  await writeLockfile(opts.workdir, lock);
  console.log(`Pinned ${trimmed}${reason ? `: ${reason}` : ""}`);
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
  inputAllowed: boolean,
) {
  const trimmed = normalizeSkillSlugOrFail(slug);

  // Prompt for target agent when --agent is not provided and interactive
  let installWorkdir = opts.workdir;
  let installDir = opts.dir;
  let installAgent = opts.agent;
  if (!opts.agent && isInteractive()) {
    const picked = await selectAgent();
    if (picked) {
      installWorkdir = picked.workdir;
      installDir = picked.dir;
      installAgent = picked.agent;
    }
  }

  // Scope selection (copied from vercel-labs/skills)
  if (installAgent && !opts.globalScopeExplicit && isInteractive()) {
    const scope = await selectScope(installAgent as AgentName);
    if (scope === null) {
      console.log("Uninstall cancelled");
      return;
    }
    if (scope) {
      installWorkdir = resolveAgentWorkdir(installAgent as AgentName, true);
      installDir = `${installWorkdir}/skills`;
    }
  }

  const lock = await readLockfile(installWorkdir);
  if (!lock.skills[trimmed]) {
    fail(`Not installed: ${trimmed}`);
  }

  const allowPrompt = isInteractive() && inputAllowed;
  if (!options.yes) {
    if (!allowPrompt) fail("Pass --yes (no input)");
    const confirm = await promptConfirm(`Uninstall ${trimmed}?`);
    if (!confirm) {
      console.log("Cancelled.");
      return;
    }
  }

  const spinner = createSpinner(`Uninstalling ${trimmed}`);
  try {
    const target = join(installDir, trimmed);

    await rm(target, { recursive: true, force: true });

    delete lock.skills[trimmed];
    await writeLockfile(installWorkdir, lock);

    const agentSuffix4 = installAgent ? ` (${getAgentLabel(installAgent as import("../agents.js").AgentName)})` : "";
    spinner.succeed(`Uninstalled ${trimmed}${agentSuffix4}`);
  } catch (error) {
    spinner.fail(formatError(error));
    throw error;
  }
}

type ExploreSort = "newest" | "downloads" | "rating" | "installs" | "installsAllTime" | "trending";
type ApiExploreSort =
  | "createdAt"
  | "updated"
  | "downloads"
  | "stars"
  | "installsCurrent"
  | "installsAllTime"
  | "trending";

export async function cmdExplore(
  opts: GlobalOpts,
  options: { limit?: number; sort?: string; json?: boolean } = {},
) {
  const registry = await getRegistry(opts, { cache: true });
  const spinner = createSpinner("Fetching latest skills");
  try {
    const url = registryUrl(ApiRoutes.skills, registry);
    const boundedLimit = clampLimit(options.limit ?? 25);
    const { apiSort } = resolveExploreSort(options.sort);
    url.searchParams.set("limit", String(boundedLimit));
    if (apiSort !== "updated") url.searchParams.set("sort", apiSort);
    const result = await apiRequest<ApiV1SkillListResponse>(
      registry,
      { method: "GET", url: url.toString() },
      ApiV1SkillListResponseSchema,
    );

    spinner.stop();
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (result.items.length === 0) {
      console.log("No skills found.");
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
  const version = item.latestVersion?.version ?? "?";
  const age = formatRelativeTime(item.updatedAt);
  const summary = item.summary ? `  ${truncate(item.summary, 50)}` : "";
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
  return "just now";
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen - 1)}…`;
}

function resolveExploreSort(raw?: string): { sort: ExploreSort; apiSort: ApiExploreSort } {
  const normalized = raw?.trim().toLowerCase();
  if (
    !normalized ||
    normalized === "newest" ||
    normalized === "createdat" ||
    normalized === "created-at"
  ) {
    return { sort: "newest", apiSort: "createdAt" };
  }
  if (normalized === "updated") {
    return { sort: "newest", apiSort: "updated" };
  }
  if (normalized === "downloads" || normalized === "download") {
    return { sort: "downloads", apiSort: "downloads" };
  }
  if (normalized === "rating" || normalized === "stars" || normalized === "star") {
    return { sort: "rating", apiSort: "stars" };
  }
  if (
    normalized === "installs" ||
    normalized === "install" ||
    normalized === "installscurrent" ||
    normalized === "installs-current" ||
    normalized === "current"
  ) {
    return { sort: "installs", apiSort: "installsCurrent" };
  }
  if (normalized === "installsalltime" || normalized === "installs-all-time") {
    return { sort: "installsAllTime", apiSort: "installsAllTime" };
  }
  if (normalized === "trending") {
    return { sort: "trending", apiSort: "trending" };
  }
  return fail(
    `Invalid sort "${raw}". Use newest, updated, downloads, rating, installs, installsAllTime, or trending.`,
  );
}

async function resolveSkillVersion(registry: string, slug: string, hash: string): Promise<ApiV1SkillResolveResponse> {
  const url = registryUrl(ApiRoutes.resolve, registry);
  url.searchParams.set("slug", slug);
  url.searchParams.set("hash", hash);
  return apiRequest<ApiV1SkillResolveResponse>(
    registry,
    { method: "GET", url: url.toString() },
    ApiV1SkillResolveResponseSchema,
  );
}

async function fileExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
