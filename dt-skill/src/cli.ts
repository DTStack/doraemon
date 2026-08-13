#!/usr/bin/env node
import { Command } from 'commander';
import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { isAgentName, listAgentNames } from './cli/agents.js';
import { getCliBuildLabel, getCliVersion } from './cli/buildInfo.js';
import {
    cmdDeleteSkill,
    cmdHideSkill,
    cmdUndeleteSkill,
    cmdUnhideSkill,
} from './cli/commands/delete.js';
import { cmdInspect } from './cli/commands/inspect.js';
import { cmdPublish } from './cli/commands/publish.js';
import {
    cmdExplore,
    cmdInstall,
    cmdList,
    cmdPin,
    cmdSearch,
    cmdUninstall,
    cmdUnpin,
    cmdUpdate,
} from './cli/commands/skills.js';
import { cmdStarSkill } from './cli/commands/star.js';
import { cmdUnstarSkill } from './cli/commands/unstar.js';
import { configureCommanderHelp, styleEnvBlock, styleTitle } from './cli/helpStyle.js';
import { DEFAULT_REGISTRY, DEFAULT_SITE, pickRegistryFromCliAndEnv } from './cli/registry.js';
import type { GlobalOpts } from './cli/types.js';
import { fail } from './cli/ui.js';

const CLAWSCAN_NOTE_HELP =
    'This note gives ClawScan context for behavior that may otherwise look unusual, such as network access, native host access, or provider-specific credentials.';

const program = new Command()
    .name('dt-skill')
    .description(
        `${styleTitle(`dt-skill CLI ${getCliBuildLabel()}`)}\n${styleEnvBlock(
            'install, update, search, and publish agent skills.'
        )}`
    )
    .version(getCliVersion(), '-V, --cli-version', 'Show CLI version')
    .option('--workdir <dir>', 'Working directory (default: cwd)')
    .option('--dir <dir>', 'Skills directory (relative to workdir, default: skills)')
    .option('--site <url>', 'Doraemon site URL for registry discovery')
    .option('--registry <url>', 'Registry API base URL (overrides default and DT_SKILL_REGISTRY)')
    .option(
        '-a, --agent <names>',
        `Target agent(s) for symlinks (${
            listAgentNames().length
        } supported; comma-separated or repeated)`,
        collectAgent,
        []
    )
    .option(
        '--global',
        'Use global scope (~/.agents/skills + lock). Required for update/uninstall of global installs; install may also prompt Project vs Global without this flag'
    )
    .option('--copy', 'Copy files into each agent dir instead of symlinking')
    .option('-y, --yes', 'Skip interactive prompts')
    .option('--no-input', 'Disable prompts')
    .showHelpAfterError()
    .showSuggestionAfterError()
    .addHelpText(
        'after',
        styleEnvBlock(
            [
                '',
                'Registry (first match wins):',
                '  1. --registry <url>',
                '  2. DT_SKILL_REGISTRY',
                '  3. cached global config',
                '  4. --site / DT_SKILL_SITE discovery',
                `  5. built-in default: ${DEFAULT_REGISTRY}`,
                '',
                'Dev example:',
                '  export DT_SKILL_REGISTRY=http://127.0.0.1:7001',
                '',
                'Env:',
                '  DT_SKILL_SITE',
                '  DT_SKILL_REGISTRY',
                '  DT_SKILL_WORKDIR',
                '',
            ].join('\n')
        )
    );

configureCommanderHelp(program);

function registerCommand(parent: Command, path: readonly string[]) {
    return parent.command(path.at(-1) ?? '');
}

function registerCommandGroup(parent: Command, path: readonly string[]) {
    return parent.command(path.at(-1) ?? '');
}

async function resolveGlobalOpts(): Promise<GlobalOpts> {
    const raw = program.opts<{
        workdir?: string;
        dir?: string;
        site?: string;
        registry?: string;
        agent?: string[];
        global?: boolean;
        copy?: boolean;
        yes?: boolean;
    }>();

    // --agent may be comma-separated and/or repeated; collectAgent already
    // flattens it into an array. Validate each against the known agent list.
    const agentList: string[] = [];
    for (const value of raw.agent ?? []) {
        for (const part of value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)) {
            if (!isAgentName(part)) {
                fail(`Unknown agent "${part}". Supported: ${listAgentNames().join(', ')}`);
            }
            agentList.push(part);
        }
    }

    const isGlobal = raw.global ?? false;

    // Canonical layout: <base>/.agents/skills, with lockfile at <base>/.agents/.dt-skill/lock.json.
    // base = home for --global, otherwise the resolved project workdir.
    const base = isGlobal ? homedir() : await resolveWorkdir(raw.workdir);
    const workdir = join(base, '.agents');
    const dir = join(workdir, 'skills');

    const site = raw.site ?? process.env.DT_SKILL_SITE ?? DEFAULT_SITE;
    const { registry, registrySource } = pickRegistryFromCliAndEnv({
        cliRegistry: raw.registry,
        envRegistry: process.env.DT_SKILL_REGISTRY,
    });
    return {
        workdir,
        dir,
        site,
        registry,
        registrySource,
        agent: agentList.length > 0 ? agentList : undefined,
        globalScope: isGlobal,
        globalScopeExplicit: raw.global !== undefined,
        copy: raw.copy,
        yes: raw.yes,
    };
}

function collectAgent(value: string, previous: string[]): string[] {
    return [...(previous ?? []), value];
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
    const lockfile = join(workdir, '.dt-skill', 'lock.json');
    if (await pathExists(lockfile)) return true;
    const markerDir = join(workdir, '.dt-skill');
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

registerCommand(program, ['search'])
    .description('Vector search skills')
    .argument('<query...>', 'Query string')
    .option('--limit <n>', 'Max results', (value) => Number.parseInt(value, 10))
    .action(async (queryParts, options) => {
        const opts = await resolveGlobalOpts();
        const query = queryParts.join(' ').trim();
        await cmdSearch(opts, query, options.limit);
    });

registerCommand(program, ['install'])
    .description('Install skill(s) into <dir>/<slug>')
    .alias('add')
    .argument('<slugs...>', 'One or more skill slugs')
    .option('--version <version>', 'Version to install (single slug only)')
    .option('--force', 'Overwrite existing folders')
    .action(async (slugs, options) => {
        const opts = await resolveGlobalOpts();
        if (options.version && slugs.length > 1) {
            fail('--version requires exactly one slug');
        }
        await cmdInstall(opts, slugs, options.version, options.force);
    });

registerCommand(program, ['update'])
    .description(
        'Update installed skills to registry content (by hash). Bare update = all tracked skills.'
    )
    .argument('[slugs...]', 'Skill slugs or paths (omit to update all)')
    .option('--all', 'Update all installed skills (same as bare update)')
    .option('--version <version>', 'Update to specific version (single slug only, legacy)')
    .option('--force', 'Overwrite when local files do not match registry content')
    .option('-g, --global', 'Update global skills only (~/.agents)')
    .option('-p, --project', 'Update project skills only')
    .action(async (slugs, options) => {
        const opts = await resolveGlobalOpts();
        const programOpts = program.opts<{ global?: boolean; yes?: boolean }>();
        await cmdUpdate(
            opts,
            slugs,
            {
                all: options.all,
                version: options.version,
                force: options.force,
                // Prefer update-local -g; fall back to program --global
                global: Boolean(options.global ?? programOpts.global),
                project: Boolean(options.project),
                yes: Boolean(programOpts.yes) || !isInputAllowed(),
            },
            isInputAllowed()
        );
    });

registerCommand(program, ['uninstall'])
    .description('Uninstall a skill')
    .argument('<slug>', 'Skill slug')
    .option('--yes', 'Skip confirmation')
    .action(async (slug, options) => {
        const opts = await resolveGlobalOpts();
        await cmdUninstall(opts, slug, options, isInputAllowed());
    });

registerCommand(program, ['list'])
    .description('List installed skills (tracked and manually installed)')
    .action(async () => {
        const opts = await resolveGlobalOpts();
        await cmdList(opts);
    });

registerCommand(program, ['pin'])
    .description('Pin an installed skill so update commands skip it')
    .argument('<slug>', 'Skill slug')
    .option('--reason <text>', 'Optional pin reason')
    .action(async (slug, options) => {
        const opts = await resolveGlobalOpts();
        await cmdPin(opts, slug, options);
    });

registerCommand(program, ['unpin'])
    .description('Remove a skill pin so updates can change it again')
    .argument('<slug>', 'Skill slug')
    .action(async (slug) => {
        const opts = await resolveGlobalOpts();
        await cmdUnpin(opts, slug);
    });

registerCommand(program, ['explore'])
    .description('Browse latest updated skills from the registry')
    .option(
        '--limit <n>',
        'Number of skills to show (max 200)',
        (value) => Number.parseInt(value, 10),
        25
    )
    .option(
        '--sort <order>',
        'Sort by newest, downloads, rating, installs, installsAllTime, or trending',
        'newest'
    )
    .option('--json', 'Output JSON')
    .action(async (options) => {
        const opts = await resolveGlobalOpts();
        const limit =
            typeof options.limit === 'number' && Number.isFinite(options.limit)
                ? options.limit
                : 25;
        await cmdExplore(opts, { limit, sort: options.sort, json: options.json });
    });

registerCommand(program, ['inspect'])
    .description('Fetch skill metadata and files without installing')
    .argument('<slug>', 'Skill slug')
    .option('--version <version>', 'Version to inspect')
    .option('--tag <tag>', 'Tag to inspect (default: latest)')
    .option('--versions', 'List version history (first page)')
    .option('--limit <n>', 'Max versions to list (1-200)', (value) => Number.parseInt(value, 10))
    .option('--files', 'List files for the selected version')
    .option('--file <path>', 'Fetch raw file content (text <= 200KB)')
    .option('--json', 'Output JSON')
    .action(async (slug, options) => {
        const opts = await resolveGlobalOpts();
        await cmdInspect(opts, slug, options);
    });

registerCommand(program, ['publish'])
    .description(
        'Publish a skill folder to the registry (push remote). Re-publish same slug overwrites by content hash.'
    )
    .alias('upload')
    .argument('<paths...>', 'Skill folder path(s)')
    .option('--slug <slug>', 'Skill slug')
    .option('--name <name>', 'Display name')
    .option('--owner <handle>', 'Publish under an org/user publisher handle')
    .option('--migrate-owner', 'Move an existing skill to the selected owner when republishing')
    .option(
        '--version <version>',
        'Optional semver (compatibility; default 0.0.0, hash detects changes)'
    )
    .option('--fork-of <slug[@version]>', 'Mark as a fork of an existing skill')
    .option('--changelog <text>', 'Changelog text')
    .option('--clawscan-note <text>', CLAWSCAN_NOTE_HELP)
    .option('--tags <tags>', 'Comma-separated tags', 'latest')
    .option('--all', 'Batch mode: upload all discovered skills without interactive selection')
    .option('--category <category>', 'Category (required on first publish in non-interactive mode)')
    .option(
        '--description <text>',
        'Optional market card summary (create defaults from SKILL.md; re-publish keeps card unless set)'
    )
    .option('--yes', 'Skip overwrite confirmation')
    .action(async (folders, options) => {
        const opts = await resolveGlobalOpts();
        await cmdPublish(opts, folders, options);
    });

registerCommand(program, ['delete'])
    .description('Soft-delete one of your skills')
    .argument('<slug>', 'Skill slug')
    .option('--reason <text>', 'Moderation note/reason')
    .option('--note <text>', 'Alias for --reason')
    .option('--yes', 'Skip confirmation')
    .action(async (slug, options) => {
        const opts = await resolveGlobalOpts();
        await cmdDeleteSkill(opts, slug, options, isInputAllowed());
    });

registerCommand(program, ['hide'])
    .description('Hide one of your skills')
    .argument('<slug>', 'Skill slug')
    .option('--reason <text>', 'Moderation note/reason')
    .option('--note <text>', 'Alias for --reason')
    .option('--yes', 'Skip confirmation')
    .action(async (slug, options) => {
        const opts = await resolveGlobalOpts();
        await cmdHideSkill(opts, slug, options, isInputAllowed());
    });

registerCommand(program, ['undelete'])
    .description('Restore one of your hidden skills')
    .argument('<slug>', 'Skill slug')
    .option('--reason <text>', 'Moderation note/reason')
    .option('--note <text>', 'Alias for --reason')
    .option('--yes', 'Skip confirmation')
    .action(async (slug, options) => {
        const opts = await resolveGlobalOpts();
        await cmdUndeleteSkill(opts, slug, options, isInputAllowed());
    });

registerCommand(program, ['unhide'])
    .description('Unhide one of your skills')
    .argument('<slug>', 'Skill slug')
    .option('--reason <text>', 'Moderation note/reason')
    .option('--note <text>', 'Alias for --reason')
    .option('--yes', 'Skip confirmation')
    .action(async (slug, options) => {
        const opts = await resolveGlobalOpts();
        await cmdUnhideSkill(opts, slug, options, isInputAllowed());
    });

const skill = registerCommandGroup(program, ['skill']).description('Manage published skills');
registerCommand(skill, ['skill', 'publish'])
    .description('Publish a skill from folder (same as publish/upload)')
    .argument('<paths...>', 'Skill folder path(s)')
    .option('--slug <slug>', 'Skill slug')
    .option('--name <name>', 'Display name')
    .option('--owner <handle>', 'Publish under an org/user publisher handle')
    .option('--migrate-owner', 'Move an existing skill to the selected owner when republishing')
    .option('--version <version>', 'Optional semver (compatibility; default 0.0.0)')
    .option('--fork-of <slug[@version]>', 'Mark as a fork of an existing skill')
    .option('--changelog <text>', 'Changelog text')
    .option('--clawscan-note <text>', CLAWSCAN_NOTE_HELP)
    .option('--tags <tags>', 'Comma-separated tags', 'latest')
    .option('--category <category>', 'Category (required on first publish in non-interactive mode)')
    .option(
        '--description <text>',
        'Optional market card summary (create defaults from SKILL.md; re-publish keeps card unless set)'
    )
    .option('--yes', 'Skip overwrite confirmation')
    .action(async (folders, options) => {
        const opts = await resolveGlobalOpts();
        await cmdPublish(opts, folders, options);
    });

registerCommand(program, ['star'])
    .description('Add a skill to your highlights')
    .argument('<slug>', 'Skill slug')
    .option('--yes', 'Skip confirmation')
    .action(async (slug, options) => {
        const opts = await resolveGlobalOpts();
        await cmdStarSkill(opts, slug, options, isInputAllowed());
    });

registerCommand(program, ['unstar'])
    .description('Remove a skill from your highlights')
    .argument('<slug>', 'Skill slug')
    .option('--yes', 'Skip confirmation')
    .action(async (slug, options) => {
        const opts = await resolveGlobalOpts();
        await cmdUnstarSkill(opts, slug, options, isInputAllowed());
    });

program.action(async () => {
    program.outputHelp();
    process.exitCode = 0;
});

program.parseAsync(process.argv).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
});
