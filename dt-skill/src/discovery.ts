import { parseArk, WellKnownConfigSchema } from "./schema/index.js";

export async function discoverRegistryFromSite(siteUrl: string) {
  const url = new URL("/.well-known/dt-skill.json", siteUrl);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const raw = (await response.json()) as unknown;
  const parsed = parseArk(WellKnownConfigSchema, raw, "WellKnown config");
  const apiBase = "apiBase" in parsed ? parsed.apiBase : parsed.registry;
  if (!apiBase) return null;
  return {
    apiBase,
    minCliVersion: parsed.minCliVersion,
  };
}
