import { mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { extractZipToDir } from '../../skills.js';
import { fail } from '../ui.js';

export function normalizeSkillSlugOrFail(raw: string) {
    const slug = raw.trim();
    if (!slug) fail('Slug required');
    if (slug.includes('/') || slug.includes('\\') || slug.includes('..')) {
        fail(`Invalid slug: ${slug}`);
    }
    return slug;
}

export function isSafeSkillSlug(slug: string) {
    return Boolean(slug) && !slug.includes('/') && !slug.includes('\\') && !slug.includes('..');
}

export async function fileExists(path: string) {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

export async function prepareSkillUpdate(zip: Uint8Array, target: string) {
    await mkdir(dirname(target), { recursive: true });
    const preparedDir = await mkdtemp(join(dirname(target), `.${basename(target)}-update-`));
    try {
        await extractZipToDir(zip, preparedDir);
        return preparedDir;
    } catch (error) {
        await rm(preparedDir, { recursive: true, force: true }).catch(() => {});
        throw error;
    }
}

export async function replaceSkillDirectory(
    preparedDir: string,
    target: string,
    targetExists: boolean
) {
    const backupDir = `${preparedDir}-previous`;
    let movedExisting = false;

    try {
        if (targetExists) {
            await rename(target, backupDir);
            movedExisting = true;
        }
        await rename(preparedDir, target);
    } catch (error) {
        if (movedExisting) {
            try {
                await rename(backupDir, target);
            } catch (rollbackError) {
                throw new AggregateError(
                    [error, rollbackError],
                    `Failed to replace ${target} and restore the previous installation`
                );
            }
        }
        throw error;
    }

    await rm(backupDir, { recursive: true, force: true }).catch(() => {});
}
