// Install pipeline: the physical download → extract → origin → link → lock
// sequence for one skill. Extracted from commands/skills.ts so the deepest
// part of the install flow is its own module with an injected HttpClient
// seam (real in prod, fake in tests) rather than reaching for the http
// singletons.
import { type AgentType } from './agents.js';
import { linkOrCopyToAgent, type InstallMode } from './installer.js';
import { withPinnedMetadata, writeLockfile, type Lockfile, type LockfileEntry } from '../lockfile.js';
import { extractZipToDir, hashSkillFiles, listTextFiles, writeSkillOrigin } from '../skills.js';

export interface InstallTargets {
    agents: AgentType[];
    global: boolean;
    mode: InstallMode;
}

/** Http capabilities the pipeline needs. Injected so tests pass a fake. */
export interface InstallPipelineHttp {
    downloadZip: (registry: string, args: { slug: string; version?: string }) => Promise<Uint8Array>;
}

type SpinnerLike = { text: string };

/**
 * Download, extract, write origin, link to agents, and persist the lockfile for
 * one skill. The canonical dir must already be cleared (force) or absent —
 * callers handle pre-flight guards (pinned, moderation, version, exists).
 */
export async function installExtractedSkill(
    args: {
        slug: string;
        version: string;
        canonicalDir: string;
        canonicalWorkdir: string;
        targets: InstallTargets;
        registry: string;
        base: string;
        lock: Lockfile;
        existingEntry?: LockfileEntry;
        spinner: SpinnerLike;
    },
    http: InstallPipelineHttp
): Promise<void> {
    const {
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
    } = args;
    spinner.text = `Downloading ${slug}@${version}`;
    const zip = await http.downloadZip(registry, { slug, version });
    await extractZipToDir(zip, canonicalDir);
    const installedFiles = await listTextFiles(canonicalDir);
    const installedFingerprint =
        installedFiles.length > 0 ? hashSkillFiles(installedFiles).fingerprint : undefined;
    await writeSkillOrigin(canonicalDir, {
        version: 1,
        registry,
        slug,
        installedVersion: version,
        installedAt: Date.now(),
        fingerprint: installedFingerprint,
    });
    for (const agent of targets.agents) {
        await linkOrCopyToAgent(slug, canonicalDir, agent, {
            global: targets.global,
            cwd: base,
            mode: targets.mode,
        });
    }
    lock.skills[slug] = withPinnedMetadata(version, Date.now(), existingEntry);
    await writeLockfile(canonicalWorkdir, lock);
}
