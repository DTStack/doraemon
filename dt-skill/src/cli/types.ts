export type GlobalOpts = {
  workdir: string;
  dir: string;
  site: string;
  registry: string;
  registrySource: "cli" | "env" | "default";
  agent?: string;
  globalScope?: boolean;
  globalScopeExplicit?: boolean;
};

export type ResolveResult = {
  match: { version: string } | null;
  latestVersion: { version: string } | null;
};
