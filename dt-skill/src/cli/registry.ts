import { readGlobalConfig, writeGlobalConfig } from '../config.js';
import { discoverRegistryFromSite } from '../discovery.js';
import type { GlobalOpts } from './types.js';

export const DEFAULT_SITE = '';
/** Built-in intranet deploy registry (overridable via --registry / DT_SKILL_REGISTRY). */
export const DEFAULT_REGISTRY = 'http://172.16.100.225:7001';

/** Strip trailing slashes so join paths do not become `//api/...`. */
export function normalizeRegistryBase(url: string): string {
    return String(url || '')
        .trim()
        .replace(/\/+$/, '');
}

/**
 * Map CLI flag + env to registry opts (priority: --registry > DT_SKILL_REGISTRY > default).
 * Pure helper so unit tests can exercise the real selection path without commander.
 */
export function pickRegistryFromCliAndEnv(args: {
    cliRegistry?: string | null;
    envRegistry?: string | null;
}): { registry: string; registrySource: 'cli' | 'env' | 'default' } {
    const fromCli = String(args.cliRegistry ?? '').trim();
    if (fromCli) {
        return { registry: fromCli, registrySource: 'cli' };
    }
    const fromEnv = String(args.envRegistry ?? '').trim();
    if (fromEnv) {
        return { registry: fromEnv, registrySource: 'env' };
    }
    return { registry: DEFAULT_REGISTRY, registrySource: 'default' };
}

export async function resolveRegistry(opts: GlobalOpts) {
    const explicit = opts.registrySource !== 'default' ? opts.registry.trim() : '';
    if (explicit) return normalizeRegistryBase(explicit);

    const cfg = await readGlobalConfig();
    const cached = cfg?.registry?.trim();
    if (cached) return normalizeRegistryBase(cached);

    const site = opts.site.trim();
    if (site) {
        const discovery = await discoverRegistryFromSite(site).catch(() => null);
        const discovered = discovery?.apiBase?.trim();
        if (discovered) return normalizeRegistryBase(discovered);
    }

    // Built-in deploy default (ticket 01). Empty only if constant is cleared.
    const fallback = normalizeRegistryBase(DEFAULT_REGISTRY);
    if (!fallback) {
        throw new Error(
            'Registry is not configured. Copy a command from the Doraemon Skills page or pass --registry <url>.'
        );
    }
    return fallback;
}

export async function getRegistry(opts: GlobalOpts, params?: { cache?: boolean }) {
    const cache = params?.cache !== false;
    const registry = await resolveRegistry(opts);
    if (!cache) return registry;
    const cfg = await readGlobalConfig();
    const cached = cfg?.registry?.trim();
    if (!cached || normalizeRegistryBase(cached) !== registry) {
        await writeGlobalConfig({ registry });
    }
    return registry;
}
