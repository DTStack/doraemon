#!/usr/bin/env node
import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Command } from "commander";
import { getCliBuildLabel, getCliVersion } from "./cli/buildInfo.js";
import {
  cmdDeleteSkill,
  cmdHideSkill,
  cmdUndeleteSkill,
  cmdUnhideSkill,
} from "./cli/commands/delete.js";
import { cmdInspect } from "./cli/commands/inspect.js";
import { cmdPublish } from "./cli/commands/publish.js";
import {
  cmdExplore,
  cmdInstall,
  cmdList,
  cmdPin,
  cmdSearch,
  cmdUninstall,
  cmdUnpin,
  cmdUpdate,
} from "./cli/commands/skills.js";
import { cmdStarSkill } from "./cli/commands/star.js";
import { cmdUnstarSkill } from "./cli/commands/unstar.js";
import { isAgentName, listAgentNames, resolveAgentWorkdir } from "./cli/agents.js";
import { configureCommanderHelp, styleEnvBlock, styleTitle } from "./cli/helpStyle.js";
import { DEFAULT_REGISTRY, DEFAULT_SITE } from "./cli/registry.js";
import type { GlobalOpts } from "./cli/types.js";
import { fail } from "./cli/ui.js";

const CLAWSCAN_NOTE_HELP =
  "This note gives ClawScan context for behavior that may otherwise look unusual, such as network access, native host access, or provider-specific credentials.";

const program = new Command()
  .name("dt-skill")
  .description(
    `${styleTitle(`dt-skill CLI ${getCliBuildLabel()}`)}\n${styleEnvBlock(
      "install, update, search, and publish agent skills.",
    )}`,
  )
  .version(getCliVersion(), "-V, --cli-version", "Show CLI version")
  .option("--workdir <dir>", "Working directory (default: cwd)")
  .option("--dir <dir>", "Skills directory (relative to workdir, default: skills)")
  .option("--site <url>", "Doraemon site URL for registry discovery")
  .option("--registry <url>", "Registry API base URL")
  .option("--agent <name>", `Target agent (${listAgentNames().join(", ")})`)
  .option("--global", "Install skills to the global agent directory (requires --agent)")
  .option("--no-input", "Disable prompts")
  .showHelpAfterError()
  .showSuggestionAfterError()
  .addHelpText(
    "after",
    styleEnvBlock(
      "\nEnv:\n  DT_SKILL_SITE\n  DT_SKILL_REGISTRY\n  DT_SKILL_WORKDIR\n",
    ),
  );

configureCommanderHelp(program);

function registerCommand(parent: Command, path: readonly string[]) {
  return parent.command(path.at(-1) ?? "");
}

function registerCommandGroup(parent: Command, path: readonly string[]) {
  return parent.command(path.at(-1) ?? "");
}

async function resolveGlobalOpts(): Promise<GlobalOpts> {
  const raw = program.opts<{
    workdir?: string;
    dir?: string;
    site?: string;
    registry?: string;
    agent?: string;
    global?: boolean;
  }>();

  const rawAgent = raw.agent?.trim();
  if (rawAgent && !isAgentName(rawAgent)) {
    fail(`Unknown agent "${rawAgent}". Supported: ${listAgentNames().join(", ")}`);
  }
  const agentName: string | undefined = rawAgent;

  const isGlobal = raw.global ?? false;
  if (isGlobal && !agentName) {
    fail("--global requires --agent");
  }

  let workdir: string;
  let dir: string;

  if (agentName) {
    workdir = resolveAgentWorkdir(agentName as import("./cli/agents.js").AgentName, isGlobal);
    dir = resolve(workdir, "skills");
  } else {
    workdir = await resolveWorkdir(raw.workdir);
    dir = resolve(workdir, raw.dir ?? "skills");
  }

  const site = raw.site ?? process.env.DT_SKILL_SITE ?? DEFAULT_SITE;
  const registrySource = raw.registry
    ? "cli"
    : process.env.DT_SKILL_REGISTRY
      ? "env"
      : "default";
  const registry = raw.registry ?? process.env.DT_SKILL_REGISTRY ?? DEFAULT_REGISTRY;
  return { workdir, dir, site, registry, registrySource, agent: agentName, globalScope: isGlobal, globalScopeExplicit: raw.global !== undefined };
}

function isInputAllowed() {
  const globalFlags = program.opts<{ input?: boolean }>();
  return globalFlags.input !== false;
}

async function resolveWorkdir(explicit?: string) {
  if (explicit?.trim()) return resolve(explicit.trim());
  const envWorkdir = process.env.DT_SKILL_WORKDIR?.trim();
  if (envWorkdir) return resolve(envWorkdir);

  const cwd = resolve(process.cwd());
  if (await hasDtSkillMarker(cwd)) return cwd;
  return cwd;
}

async function hasDtSkillMarker(workdir: string) {
  const lockfile = join(workdir, ".dt-skill", "lock.json");
  if (await pathExists(lockfile)) return true;
  const markerDir = join(workdir, ".dt-skill");
  return pathExists(markerDir);
}

async function pathExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

registerCommand(program, ["search"])
  .description("Vector search skills")
  .argument("<query...>", "Query string")
  .option("--limit <n>", "Max results", (value) => Number.parseInt(value, 10))
  .action(async (queryParts, options) => {
    const opts = await resolveGlobalOpts();
    const query = queryParts.join(" ").trim();
    await cmdSearch(opts, query, options.limit);
  });

registerCommand(program, ["install"])
  .description("Install skill(s) into <dir>/<slug>")
  .argument("<slugs...>", "One or more skill slugs")
  .option("--version <version>", "Version to install (single slug only)")
  .option("--force", "Overwrite existing folders")
  .action(async (slugs, options) => {
    const opts = await resolveGlobalOpts();
    if (options.version && slugs.length > 1) {
      fail("--version requires exactly one slug");
    }
    await cmdInstall(opts, slugs, options.version, options.force);
  });

registerCommand(program, ["update"])
  .description("Update installed skills")
  .argument("[slug]", "Skill slug")
  .option("--all", "Update all installed skills")
  .option("--version <version>", "Update to specific version (single slug only)")
  .option("--force", "Overwrite when local files do not match any version")
  .action(async (slug, options) => {
    const opts = await resolveGlobalOpts();
    await cmdUpdate(opts, slug, options, isInputAllowed());
  });

registerCommand(program, ["uninstall"])
  .description("Uninstall a skill")
  .argument("<slug>", "Skill slug")
  .option("--yes", "Skip confirmation")
  .action(async (slug, options) => {
    const opts = await resolveGlobalOpts();
    await cmdUninstall(opts, slug, options, isInputAllowed());
  });

registerCommand(program, ["list"])
  .description("List installed skills (tracked and manually installed)")
  .action(async () => {
    const opts = await resolveGlobalOpts();
    await cmdList(opts);
  });

registerCommand(program, ["pin"])
  .description("Pin an installed skill so update commands skip it")
  .argument("<slug>", "Skill slug")
  .option("--reason <text>", "Optional pin reason")
  .action(async (slug, options) => {
    const opts = await resolveGlobalOpts();
    await cmdPin(opts, slug, options);
  });

registerCommand(program, ["unpin"])
  .description("Remove a skill pin so updates can change it again")
  .argument("<slug>", "Skill slug")
  .action(async (slug) => {
    const opts = await resolveGlobalOpts();
    await cmdUnpin(opts, slug);
  });

registerCommand(program, ["explore"])
  .description("Browse latest updated skills from the registry")
  .option(
    "--limit <n>",
    "Number of skills to show (max 200)",
    (value) => Number.parseInt(value, 10),
    25,
  )
  .option(
    "--sort <order>",
    "Sort by newest, downloads, rating, installs, installsAllTime, or trending",
    "newest",
  )
  .option("--json", "Output JSON")
  .action(async (options) => {
    const opts = await resolveGlobalOpts();
    const limit =
      typeof options.limit === "number" && Number.isFinite(options.limit) ? options.limit : 25;
    await cmdExplore(opts, { limit, sort: options.sort, json: options.json });
  });

registerCommand(program, ["inspect"])
  .description("Fetch skill metadata and files without installing")
  .argument("<slug>", "Skill slug")
  .option("--version <version>", "Version to inspect")
  .option("--tag <tag>", "Tag to inspect (default: latest)")
  .option("--versions", "List version history (first page)")
  .option("--limit <n>", "Max versions to list (1-200)", (value) => Number.parseInt(value, 10))
  .option("--files", "List files for the selected version")
  .option("--file <path>", "Fetch raw file content (text <= 200KB)")
  .option("--json", "Output JSON")
  .action(async (slug, options) => {
    const opts = await resolveGlobalOpts();
    await cmdInspect(opts, slug, options);
  });

registerCommand(program, ["publish"])
  .description("Legacy alias: publish a skill from folder")
  .argument("<path>", "Skill folder path")
  .option("--slug <slug>", "Skill slug")
  .option("--name <name>", "Display name")
  .option("--owner <handle>", "Publish under an org/user publisher handle")
  .option("--migrate-owner", "Move an existing skill to the selected owner when republishing")
  .option("--version <version>", "Version (semver)")
  .option("--fork-of <slug[@version]>", "Mark as a fork of an existing skill")
  .option("--changelog <text>", "Changelog text")
  .option("--clawscan-note <text>", CLAWSCAN_NOTE_HELP)
  .option("--tags <tags>", "Comma-separated tags", "latest")
  .option("--all", "Batch mode: upload all discovered skills without interactive selection")
  .option("--category <category>", "Category for batch upload")
  .action(async (folder, options) => {
    const opts = await resolveGlobalOpts();
    await cmdPublish(opts, folder, options);
  });

registerCommand(program, ["delete"])
  .description("Soft-delete one of your skills")
  .argument("<slug>", "Skill slug")
  .option("--reason <text>", "Moderation note/reason")
  .option("--note <text>", "Alias for --reason")
  .option("--yes", "Skip confirmation")
  .action(async (slug, options) => {
    const opts = await resolveGlobalOpts();
    await cmdDeleteSkill(opts, slug, options, isInputAllowed());
  });

registerCommand(program, ["hide"])
  .description("Hide one of your skills")
  .argument("<slug>", "Skill slug")
  .option("--reason <text>", "Moderation note/reason")
  .option("--note <text>", "Alias for --reason")
  .option("--yes", "Skip confirmation")
  .action(async (slug, options) => {
    const opts = await resolveGlobalOpts();
    await cmdHideSkill(opts, slug, options, isInputAllowed());
  });

registerCommand(program, ["undelete"])
  .description("Restore one of your hidden skills")
  .argument("<slug>", "Skill slug")
  .option("--reason <text>", "Moderation note/reason")
  .option("--note <text>", "Alias for --reason")
  .option("--yes", "Skip confirmation")
  .action(async (slug, options) => {
    const opts = await resolveGlobalOpts();
    await cmdUndeleteSkill(opts, slug, options, isInputAllowed());
  });

registerCommand(program, ["unhide"])
  .description("Unhide one of your skills")
  .argument("<slug>", "Skill slug")
  .option("--reason <text>", "Moderation note/reason")
  .option("--note <text>", "Alias for --reason")
  .option("--yes", "Skip confirmation")
  .action(async (slug, options) => {
    const opts = await resolveGlobalOpts();
    await cmdUnhideSkill(opts, slug, options, isInputAllowed());
  });

const skill = registerCommandGroup(program, ["skill"]).description("Manage published skills");
registerCommand(skill, ["skill", "publish"])
  .description("Publish a skill from folder")
  .argument("<path>", "Skill folder path")
  .option("--slug <slug>", "Skill slug")
  .option("--name <name>", "Display name")
  .option("--owner <handle>", "Publish under an org/user publisher handle")
  .option("--migrate-owner", "Move an existing skill to the selected owner when republishing")
  .option("--version <version>", "Version (semver)")
  .option("--fork-of <slug[@version]>", "Mark as a fork of an existing skill")
  .option("--changelog <text>", "Changelog text")
  .option("--clawscan-note <text>", CLAWSCAN_NOTE_HELP)
  .option("--tags <tags>", "Comma-separated tags", "latest")
  .action(async (folder, options) => {
    const opts = await resolveGlobalOpts();
    await cmdPublish(opts, folder, options);
  });

registerCommand(program, ["star"])
  .description("Add a skill to your highlights")
  .argument("<slug>", "Skill slug")
  .option("--yes", "Skip confirmation")
  .action(async (slug, options) => {
    const opts = await resolveGlobalOpts();
    await cmdStarSkill(opts, slug, options, isInputAllowed());
  });

registerCommand(program, ["unstar"])
  .description("Remove a skill from your highlights")
  .argument("<slug>", "Skill slug")
  .option("--yes", "Skip confirmation")
  .action(async (slug, options) => {
    const opts = await resolveGlobalOpts();
    await cmdUnstarSkill(opts, slug, options, isInputAllowed());
  });

program.action(async () => {
  program.outputHelp();
  process.exitCode = 0;
});

void program.parseAsync(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
