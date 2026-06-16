/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalOpts } from "./types";

const readGlobalConfig = vi.fn();
const writeGlobalConfig = vi.fn();
const discoverRegistryFromSite = vi.fn();

vi.mock("../config.js", () => ({
  readGlobalConfig: (...args: unknown[]) => readGlobalConfig(...args),
  writeGlobalConfig: (...args: unknown[]) => writeGlobalConfig(...args),
}));

vi.mock("../discovery.js", () => ({
  discoverRegistryFromSite: (...args: unknown[]) => discoverRegistryFromSite(...args),
}));

const { DEFAULT_REGISTRY, DEFAULT_SITE, getRegistry, resolveRegistry } = await import("./registry");

function makeOpts(overrides: Partial<GlobalOpts> = {}): GlobalOpts {
  return {
    workdir: "/work",
    dir: "/work/skills",
    site: "",
    registry: DEFAULT_REGISTRY,
    registrySource: "default",
    ...overrides,
  };
}

beforeEach(() => {
  readGlobalConfig.mockReset();
  writeGlobalConfig.mockReset();
  discoverRegistryFromSite.mockReset();
});

describe("registry resolution", () => {
  it("has no static site or registry fallback", () => {
    expect(DEFAULT_SITE).toBe("");
    expect(DEFAULT_REGISTRY).toBe("");
  });

  it("prefers explicit registry over discovery/cache", async () => {
    readGlobalConfig.mockResolvedValue({ registry: "https://cached.example" });
    discoverRegistryFromSite.mockResolvedValue({ apiBase: "https://discovered.example" });

    const registry = await resolveRegistry(
      makeOpts({ registry: "https://custom.example", registrySource: "cli" }),
    );

    expect(registry).toBe("https://custom.example");
    expect(discoverRegistryFromSite).not.toHaveBeenCalled();
  });

  it("uses cached registry before site discovery", async () => {
    readGlobalConfig.mockResolvedValue({ registry: "http://10.0.0.7:7001" });
    discoverRegistryFromSite.mockResolvedValue({ apiBase: "http://10.0.0.8:7001" });

    const registry = await resolveRegistry(makeOpts({ site: "http://10.0.0.8:7001" }));

    expect(registry).toBe("http://10.0.0.7:7001");
    expect(discoverRegistryFromSite).not.toHaveBeenCalled();
  });

  it("discovers registry from site when cache is empty", async () => {
    readGlobalConfig.mockResolvedValue(null);
    discoverRegistryFromSite.mockResolvedValue({ apiBase: "http://10.0.0.8:7001" });

    const registry = await getRegistry(makeOpts({ site: "http://10.0.0.8:7001" }), { cache: true });

    expect(registry).toBe("http://10.0.0.8:7001");
    expect(writeGlobalConfig).toHaveBeenCalledWith({
      registry: "http://10.0.0.8:7001",
    });
  });

  it("fails clearly when no explicit, cached, or discoverable registry exists", async () => {
    readGlobalConfig.mockResolvedValue(null);
    discoverRegistryFromSite.mockResolvedValue(null);

    await expect(getRegistry(makeOpts(), { cache: true })).rejects.toThrow(
      "Registry is not configured",
    );
    expect(writeGlobalConfig).not.toHaveBeenCalled();
  });

  it("caches an explicit runtime registry even when another custom registry was cached", async () => {
    readGlobalConfig.mockResolvedValue({ registry: "http://10.0.0.7:7001" });

    const registry = await getRegistry(
      makeOpts({ registry: "http://10.0.0.8:7001", registrySource: "cli" }),
      { cache: true },
    );

    expect(registry).toBe("http://10.0.0.8:7001");
    expect(writeGlobalConfig).toHaveBeenCalledWith({
      registry: "http://10.0.0.8:7001",
    });
  });
});
