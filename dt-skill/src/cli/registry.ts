import { readGlobalConfig, writeGlobalConfig } from "../config.js";
import { discoverRegistryFromSite } from "../discovery.js";
import type { GlobalOpts } from "./types.js";

export const DEFAULT_SITE = "";
export const DEFAULT_REGISTRY = "";
const LEGACY_REGISTRY_HOSTS = new Set([
  "auth.clawdhub.com",
  "auth.clawhub.com",
  "auth.clawhub.ai",
  "registry.clawhub.ai",
]);

export async function resolveRegistry(opts: GlobalOpts) {
  const explicit = opts.registrySource !== "default" ? opts.registry.trim() : "";
  if (explicit) return explicit;

  const cfg = await readGlobalConfig();
  const cached = cfg?.registry?.trim();
  if (cached && !isLegacyRegistry(cached)) return cached;

  const site = opts.site.trim();
  if (site) {
    const discovery = await discoverRegistryFromSite(site).catch(() => null);
    const discovered = discovery?.apiBase?.trim();
    if (discovered) return discovered;
  }

  throw new Error(
    "Registry is not configured. Copy a command from the Doraemon Skills page or pass --registry <url>.",
  );
}

export async function getRegistry(opts: GlobalOpts, params?: { cache?: boolean }) {
  const cache = params?.cache !== false;
  const registry = await resolveRegistry(opts);
  if (!cache) return registry;
  const cfg = await readGlobalConfig();
  const cached = cfg?.registry?.trim();
  const shouldUpdate =
    !cached ||
    isLegacyRegistry(cached) ||
    cached !== registry;
  if (shouldUpdate) await writeGlobalConfig({ registry });
  return registry;
}

function isLegacyRegistry(registry: string) {
  try {
    return LEGACY_REGISTRY_HOSTS.has(new URL(registry).hostname);
  } catch {
    return false;
  }
}
