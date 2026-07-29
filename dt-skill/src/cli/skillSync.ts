/**
 * Skill content sync decision (hash-only happy path).
 * One deep module: local fingerprint vs remote current fingerprint.
 * Version is only a download token for the registry zip endpoint.
 */

export type RemoteCurrent = {
    /** Canonical content id for the skill's current slot. */
    fingerprint: string | null;
    /** Download token (registry may still key zip by version string). */
    version: string | null;
};

export type SyncDecision =
    | { action: 'missing' }
    | { action: 'up_to_date'; version: string; fingerprint: string | null }
    | { action: 'update'; version: string; fingerprint: string | null };

/**
 * Canonical remote identity from skill detail.
 * Prefer skill.fingerprint only — single field (C2).
 */
export function remoteCurrentFromDetail(skillMeta: {
    skill?: {
        fingerprint?: string | null;
        version?: string | null;
    } | null;
    latestVersion?: {
        version?: string | null;
        fingerprint?: string | null;
    } | null;
}): RemoteCurrent {
    const fingerprint =
        skillMeta.skill?.fingerprint != null && skillMeta.skill.fingerprint !== ''
            ? skillMeta.skill.fingerprint
            : null;
    const version =
        (skillMeta.skill?.version != null && skillMeta.skill.version !== ''
            ? skillMeta.skill.version
            : null) ??
        (skillMeta.latestVersion?.version != null && skillMeta.latestVersion.version !== ''
            ? skillMeta.latestVersion.version
            : null);
    return { fingerprint, version };
}

/**
 * Decide whether local install matches remote current content.
 * Main path: compare fingerprints. No resolve API.
 * explicitVersion: legacy side door — always request that version token.
 */
export function decideSkillSync(args: {
    localFingerprint: string | null;
    remote: RemoteCurrent;
    explicitVersion?: string;
}): SyncDecision {
    if (args.explicitVersion) {
        return {
            action: 'update',
            version: args.explicitVersion,
            fingerprint: args.remote.fingerprint,
        };
    }

    const version = args.remote.version || '0.0.0';
    if (!args.remote.version && !args.remote.fingerprint) {
        return { action: 'missing' };
    }

    if (
        args.localFingerprint &&
        args.remote.fingerprint &&
        args.localFingerprint === args.remote.fingerprint
    ) {
        return {
            action: 'up_to_date',
            version,
            fingerprint: args.remote.fingerprint,
        };
    }

    return {
        action: 'update',
        version,
        fingerprint: args.remote.fingerprint,
    };
}
