export type GlobalOpts = {
    /** Canonical workdir: <base>/.agents (holds .dt-skill/lock.json). */
    workdir: string;
    /** Canonical skills dir: <base>/.agents/skills. */
    dir: string;
    site: string;
    registry: string;
    registrySource: 'cli' | 'env' | 'default';
    /** Target agents for symlinks (parsed from --agent, comma or repeated). */
    agent?: string[];
    globalScope?: boolean;
    globalScopeExplicit?: boolean;
    /** Copy files instead of symlinking. */
    copy?: boolean;
    /** Skip interactive prompts. */
    yes?: boolean;
};

export type ResolveResult = {
    match: { version: string } | null;
    latestVersion: { version: string } | null;
};
