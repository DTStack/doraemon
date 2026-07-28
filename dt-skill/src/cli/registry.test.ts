/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GlobalOpts } from './types';

const readGlobalConfig = vi.fn();
const writeGlobalConfig = vi.fn();
const discoverRegistryFromSite = vi.fn();

vi.mock('../config.js', () => ({
    readGlobalConfig: (...args: unknown[]) => readGlobalConfig(...args),
    writeGlobalConfig: (...args: unknown[]) => writeGlobalConfig(...args),
}));

vi.mock('../discovery.js', () => ({
    discoverRegistryFromSite: (...args: unknown[]) => discoverRegistryFromSite(...args),
}));

const {
    DEFAULT_REGISTRY,
    DEFAULT_SITE,
    getRegistry,
    normalizeRegistryBase,
    pickRegistryFromCliAndEnv,
    resolveRegistry,
} = await import('./registry');

function makeOpts(overrides: Partial<GlobalOpts> = {}): GlobalOpts {
    return {
        workdir: '/work',
        dir: '/work/skills',
        site: '',
        registry: DEFAULT_REGISTRY,
        registrySource: 'default',
        ...overrides,
    };
}

beforeEach(() => {
    readGlobalConfig.mockReset();
    writeGlobalConfig.mockReset();
    discoverRegistryFromSite.mockReset();
});

describe('registry resolution', () => {
    it('ships a non-empty built-in deploy registry and empty default site', () => {
        expect(DEFAULT_SITE).toBe('');
        expect(DEFAULT_REGISTRY).toBe('http://172.16.100.225:7001');
        expect(normalizeRegistryBase(`${DEFAULT_REGISTRY}/`)).toBe(DEFAULT_REGISTRY);
    });

    it('uses built-in default when no explicit, cache, or site discovery', async () => {
        readGlobalConfig.mockResolvedValue(null);
        discoverRegistryFromSite.mockResolvedValue(null);

        const registry = await resolveRegistry(makeOpts());

        expect(registry).toBe('http://172.16.100.225:7001');
        expect(discoverRegistryFromSite).not.toHaveBeenCalled();
    });

    it('getRegistry caches the built-in default when cache is empty', async () => {
        readGlobalConfig.mockResolvedValue(null);

        const registry = await getRegistry(makeOpts(), { cache: true });

        expect(registry).toBe('http://172.16.100.225:7001');
        expect(writeGlobalConfig).toHaveBeenCalledWith({
            registry: 'http://172.16.100.225:7001',
        });
    });

    it('prefers explicit registry over discovery/cache', async () => {
        readGlobalConfig.mockResolvedValue({ registry: 'https://cached.example' });
        discoverRegistryFromSite.mockResolvedValue({ apiBase: 'https://discovered.example' });

        const registry = await resolveRegistry(
            makeOpts({ registry: 'https://custom.example', registrySource: 'cli' })
        );

        expect(registry).toBe('https://custom.example');
        expect(discoverRegistryFromSite).not.toHaveBeenCalled();
    });

    it('uses cached registry before site discovery and built-in default', async () => {
        readGlobalConfig.mockResolvedValue({ registry: 'http://10.0.0.7:7001' });
        discoverRegistryFromSite.mockResolvedValue({ apiBase: 'http://10.0.0.8:7001' });

        const registry = await resolveRegistry(makeOpts({ site: 'http://10.0.0.8:7001' }));

        expect(registry).toBe('http://10.0.0.7:7001');
        expect(discoverRegistryFromSite).not.toHaveBeenCalled();
    });

    it('discovers registry from site when cache is empty', async () => {
        readGlobalConfig.mockResolvedValue(null);
        discoverRegistryFromSite.mockResolvedValue({ apiBase: 'http://10.0.0.8:7001' });

        const registry = await getRegistry(makeOpts({ site: 'http://10.0.0.8:7001' }), {
            cache: true,
        });

        expect(registry).toBe('http://10.0.0.8:7001');
        expect(writeGlobalConfig).toHaveBeenCalledWith({
            registry: 'http://10.0.0.8:7001',
        });
    });

    it('caches an explicit runtime registry even when another custom registry was cached', async () => {
        readGlobalConfig.mockResolvedValue({ registry: 'http://10.0.0.7:7001' });

        const registry = await getRegistry(
            makeOpts({ registry: 'http://10.0.0.8:7001', registrySource: 'cli' }),
            { cache: true }
        );

        expect(registry).toBe('http://10.0.0.8:7001');
        expect(writeGlobalConfig).toHaveBeenCalledWith({
            registry: 'http://10.0.0.8:7001',
        });
    });

    it('pickRegistryFromCliAndEnv: cli beats env and default', () => {
        const picked = pickRegistryFromCliAndEnv({
            cliRegistry: 'http://127.0.0.1:7001/',
            envRegistry: 'http://env.example:7001',
        });
        expect(picked).toEqual({
            registry: 'http://127.0.0.1:7001/',
            registrySource: 'cli',
        });
        // Full resolve still normalizes trailing slash.
        expect(normalizeRegistryBase(picked.registry)).toBe('http://127.0.0.1:7001');
    });

    it('pickRegistryFromCliAndEnv: env beats built-in default', () => {
        expect(
            pickRegistryFromCliAndEnv({
                cliRegistry: undefined,
                envRegistry: 'http://127.0.0.1:7001',
            })
        ).toEqual({
            registry: 'http://127.0.0.1:7001',
            registrySource: 'env',
        });
    });

    it('pickRegistryFromCliAndEnv: falls back to DEFAULT_REGISTRY', () => {
        expect(pickRegistryFromCliAndEnv({})).toEqual({
            registry: DEFAULT_REGISTRY,
            registrySource: 'default',
        });
    });

    it('env-selected registry wins over cache and discovery end-to-end', async () => {
        readGlobalConfig.mockResolvedValue({ registry: DEFAULT_REGISTRY });
        discoverRegistryFromSite.mockResolvedValue({ apiBase: 'http://discovered:7001' });

        const picked = pickRegistryFromCliAndEnv({
            envRegistry: 'http://127.0.0.1:7001',
        });
        const registry = await resolveRegistry(
            makeOpts({
                registry: picked.registry,
                registrySource: picked.registrySource,
                site: 'http://site.example',
            })
        );

        expect(registry).toBe('http://127.0.0.1:7001');
        expect(discoverRegistryFromSite).not.toHaveBeenCalled();
    });
});
