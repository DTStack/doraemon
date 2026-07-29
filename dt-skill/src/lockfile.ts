import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { type Lockfile, LockfileSchema, parseArk } from './schema/index.js';

const DOT_DIR = '.dt-skill';
const LOCKFILE_NAME = 'lock.json';

/** One entry under lock.skills[slug]. Owns the on-disk entry shape. */
export type LockfileEntry = Lockfile['skills'][string];
export type { Lockfile };

export async function readLockfile(workdir: string): Promise<Lockfile> {
    const path = join(workdir, DOT_DIR, LOCKFILE_NAME);
    try {
        const raw = await readFile(path, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        return parseArk(LockfileSchema, parsed, 'Lockfile');
    } catch {
        return { version: 1, skills: {} };
    }
}

export async function writeLockfile(workdir: string, lock: Lockfile) {
    const path = join(workdir, DOT_DIR, LOCKFILE_NAME);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
}

export function isPinned(entry?: LockfileEntry): boolean {
    return entry?.pinned === true;
}

/** Build an entry that preserves any existing pin across a version/installedAt change. */
export function withPinnedMetadata(
    version: string | null,
    installedAt: number,
    existing?: LockfileEntry,
    fingerprint?: string | null
): LockfileEntry {
    const nextFingerprint =
        fingerprint !== undefined && fingerprint !== null ? fingerprint : existing?.fingerprint;
    return {
        version,
        installedAt,
        ...(nextFingerprint ? { fingerprint: nextFingerprint } : {}),
        ...(existing?.pinned ? { pinned: true } : {}),
        ...(existing?.pinned && existing.pinReason ? { pinReason: existing.pinReason } : {}),
    };
}

export function formatPinnedDetails(entry?: LockfileEntry): string {
    return entry?.pinReason ? ` (${entry.pinReason})` : '';
}
