import { confirm, intro, isCancel, note, select } from '@clack/prompts';
import { spawn } from 'node:child_process';
import { stdin } from 'node:process';
import ora from 'ora';
import pc from 'picocolors';

import {
    AGENT_DEFINITIONS,
    type AgentType,
    detectInstalledAgents,
    getNonUniversalAgents,
    getVisibleUniversalAgents,
} from './agents/definitions.js';
import { searchMultiselect } from './prompts/search-multiselect.js';
import type { InstallMode } from './installer.js';

export async function promptHidden(prompt: string) {
    if (!stdin.isTTY) return '';
    process.stdout.write(prompt);
    const chunks: Buffer[] = [];
    stdin.setRawMode(true);
    stdin.resume();
    return new Promise<string>((resolve) => {
        function onData(data: Buffer) {
            const text = data.toString('utf8');
            if (text === '\r' || text === '\n') {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.off('data', onData);
                process.stdout.write('\n');
                resolve(Buffer.concat(chunks).toString('utf8').trim());
                return;
            }
            if (text === '\u0003') {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.off('data', onData);
                process.stdout.write('\n');
                fail('Canceled');
            }
            if (text === '\u007f') {
                chunks.pop();
                return;
            }
            chunks.push(data);
        }
        stdin.on('data', onData);
    });
}

export async function promptConfirm(prompt: string) {
    const answer = await confirm({ message: prompt });
    if (isCancel(answer)) return false;
    return answer;
}

export function openInBrowser(url: string) {
    const args =
        process.platform === 'darwin'
            ? ['open', url]
            : process.platform === 'win32'
            ? ['explorer', url]
            : ['xdg-open', url];
    const [command, ...commandArgs] = args;
    if (!command) return;

    const child = spawn(command, commandArgs, { stdio: 'ignore', detached: true });

    child.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            console.log('');
            console.log('Could not open browser automatically.');
            console.log('Please open this URL manually:');
            console.log('');
            console.log(`  ${url}`);
            console.log('');
        }
    });

    child.unref();
}

export function isInteractive() {
    return process.stdout.isTTY && stdin.isTTY;
}

export function createSpinner(text: string) {
    return ora({ text, spinner: 'dots', isEnabled: isInteractive() }).start();
}

export function formatError(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
}

export function fail(message: string): never {
    throw new Error(message);
}

// ─── Install TUI (aligned 1:1 with `npx skills add`) ───

const SKILLS_LOGO = [
    ' ____    _____   _____   _  __    ___    _        _      ',
    '|  _ \\  |_   _| / ___|  | |/ /   |_ _|  | |      | |     ',
    "| | | |   | |   \\___ \\  | ' /     | |   | |      | |     ",
    '| |_| |   | |    ___) | | . \\     | |   | |___   | |___  ',
    '|____/   |___|  |____/  |_|\\_\\   |___|  |_____|  |_____| ',
].join('\n');

/** Print the DTSKILLS ASCII banner + clack intro header. */
export function printSkillsLogo() {
    console.log(pc.cyan(SKILLS_LOGO));
    console.log();
    intro(pc.bgCyan(pc.black(' dt-skill ')));
}

function isCancelled(value: unknown): value is symbol {
    return typeof value === 'symbol';
}

/**
 * Interactive agent selection with fuzzy search. Universal agents are shown as a
 * locked, always-included section; detected agents are surfaced to the top; the
 * rest are searchable below. Nothing is pre-selected by default — matches
 * `selectAgentsInteractive` from vercel-labs/skills (which pre-selects only
 * last-used history, none on first run). Pre-selecting every detected agent
 * would amount to "select all" on machines with many leftover agent dirs.
 */
export async function selectAgentsInteractive(options: {
    global?: boolean;
}): Promise<AgentType[] | symbol> {
    const supportsGlobalFilter = (a: AgentType) =>
        !options.global || AGENT_DEFINITIONS[a].globalSkillsDir !== undefined;

    const universalAgents = getVisibleUniversalAgents().filter(supportsGlobalFilter);
    const otherAgents = getNonUniversalAgents().filter(supportsGlobalFilter);

    const installed = new Set(detectInstalledAgents());
    // Detected agents first, then the rest — alphabetical within each group.
    const ordered = [
        ...otherAgents.filter((a) => installed.has(a)).sort(byLabel),
        ...otherAgents.filter((a) => !installed.has(a)).sort(byLabel),
    ];

    const otherChoices = ordered.map((a) => ({
        value: a,
        label: AGENT_DEFINITIONS[a].displayName,
        hint: options.global
            ? AGENT_DEFINITIONS[a].globalSkillsDir ?? AGENT_DEFINITIONS[a].skillsDir
            : AGENT_DEFINITIONS[a].skillsDir,
    }));
    // No pre-selection: the user picks. Universal agents are always included
    // via the locked section regardless.
    const initialSelected: AgentType[] = [];

    const lockedSection = {
        title: 'Universal (.agents/skills)',
        items: universalAgents.map((a) => ({
            value: a,
            label: AGENT_DEFINITIONS[a].displayName,
        })),
    };

    const selected = await searchMultiselect({
        message: 'Which agents do you want to install to?',
        items: otherChoices,
        initialSelected,
        lockedSection,
        required: true,
    });

    return selected as AgentType[] | symbol;
}

function byLabel(a: AgentType, b: AgentType): number {
    return AGENT_DEFINITIONS[a].displayName.localeCompare(AGENT_DEFINITIONS[b].displayName);
}

/** Project vs Global scope selection. Returns true=global, false=project, null=cancelled. */
export async function selectScope(
    message = 'Installation scope'
): Promise<boolean | null> {
    if (!isInteractive()) return null;
    const scope = await select({
        message,
        options: [
            {
                value: false,
                label: 'Project',
                hint: 'Install in current directory (committed with your project)',
            },
            {
                value: true,
                label: 'Global',
                hint: 'Install in home directory (available across all projects)',
            },
        ],
    });
    if (isCancel(scope)) return null;
    return scope as boolean;
}

/** Update scope (vercel-aligned). Returns null if cancelled. */
export type UpdateScopeChoice = 'project' | 'global' | 'both';

export async function selectUpdateScope(): Promise<UpdateScopeChoice | null> {
    if (!isInteractive()) return null;
    const scope = await select({
        message: 'Update scope',
        options: [
            {
                value: 'project' as const,
                label: 'Project',
                hint: 'Update skills in current directory',
            },
            {
                value: 'global' as const,
                label: 'Global',
                hint: 'Update skills in home directory',
            },
            {
                value: 'both' as const,
                label: 'Both',
                hint: 'Update all skills',
            },
        ],
    });
    if (isCancel(scope)) return null;
    return scope as UpdateScopeChoice;
}

/** Skill market category selection (first publish). Returns null=cancelled. */
export async function selectCategory(categories: readonly string[]): Promise<string | null> {
    if (!isInteractive()) return null;
    const picked = await select({
        message: 'Select skill category',
        options: categories.map((value) => ({ value, label: value })),
    });
    if (isCancel(picked)) return null;
    return picked as string;
}

/** Symlink vs Copy method selection. Returns null=cancelled. */
export async function selectInstallMethod(): Promise<InstallMode | null> {
    if (!isInteractive()) return null;
    const mode = await select({
        message: 'Installation method',
        options: [
            {
                value: 'symlink',
                label: 'Symlink (Recommended)',
                hint: 'Single source of truth, easy updates',
            },
            {
                value: 'copy',
                label: 'Copy to all agents',
                hint: 'Independent copies for each agent',
            },
        ],
    });
    if (isCancel(mode)) return null;
    return mode as InstallMode;
}

export function noteSummary(lines: string[], title: string) {
    console.log();
    note(lines.join('\n'), title);
}

export function isCancelledValue(value: unknown): value is symbol {
    return isCancelled(value);
}
