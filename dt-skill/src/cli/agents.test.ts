import { describe, expect, it } from 'vitest';

import {
    AGENT_DEFINITIONS,
    AGENT_NAMES,
    type AgentType,
    detectAgentInstalled,
    detectInstalledAgents,
    getAgentLabel,
    getNonUniversalAgents,
    getUniversalAgents,
    getVisibleUniversalAgents,
    isAgentName,
    isUniversalAgent,
    listAgentNames,
} from './agents.js';

describe('agents', () => {
    describe('isAgentName', () => {
        it('returns true for known agents', () => {
            expect(isAgentName('claude-code')).toBe(true);
            expect(isAgentName('codex')).toBe(true);
            expect(isAgentName('cursor')).toBe(true);
        });

        it('returns false for unknown agents', () => {
            expect(isAgentName('unknown')).toBe(false);
            expect(isAgentName('')).toBe(false);
        });
    });

    describe('listAgentNames', () => {
        it('returns the full 55-agent list', () => {
            const names = listAgentNames();
            expect(names).toContain('claude-code');
            expect(names).toContain('codex');
            expect(names).toContain('cursor');
            expect(names.length).toBeGreaterThanOrEqual(55);
        });
    });

    describe('getAgentLabel', () => {
        it('returns the displayName for known agents', () => {
            expect(getAgentLabel('claude-code')).toBe('Claude Code');
            expect(getAgentLabel('codex')).toBe('Codex');
            expect(getAgentLabel('cursor')).toBe('Cursor');
        });
    });

    describe('AGENT_DEFINITIONS config', () => {
        it('has consistent structure for every agent', () => {
            for (const [key, agent] of Object.entries(AGENT_DEFINITIONS)) {
                expect(agent.name).toBe(key);
                expect(agent.displayName).toBeTruthy();
                expect(agent.skillsDir).toBeTruthy();
                // globalSkillsDir is absolute when defined; a few agents (eve, promptscript) leave it undefined.
                if (agent.globalSkillsDir !== undefined) {
                    expect(agent.globalSkillsDir).not.toContain('~');
                }
                expect(typeof agent.detectInstalled).toBe('function');
            }
        });

        it('claude-code resolves to ~/.claude/skills globally', () => {
            const dir = AGENT_DEFINITIONS['claude-code'].globalSkillsDir;
            expect(dir).toMatch(/\.claude[\/\\]skills$/);
        });

        it('codex globalSkillsDir ends with .codex/skills', () => {
            expect(AGENT_DEFINITIONS.codex.globalSkillsDir).toMatch(/\.codex[\/\\]skills$/);
        });
    });

    describe('universal agents', () => {
        it('treats .agents/skills agents as universal', () => {
            expect(isUniversalAgent('cursor')).toBe(true);
            expect(isUniversalAgent('codex')).toBe(true);
            expect(isUniversalAgent('claude-code')).toBe(false); // .claude/skills
        });

        it('getUniversalAgents excludes showInUniversalList:false (replit)', () => {
            const universal = getUniversalAgents();
            expect(universal).toContain('cursor');
            expect(universal).not.toContain('replit');
        });

        it('getVisibleUniversalAgents excludes showInUniversalPrompt:false', () => {
            const visible = getVisibleUniversalAgents();
            expect(visible).not.toContain('loaf');
            expect(visible).not.toContain('dexto');
            expect(visible).not.toContain('firebender');
        });

        it('getNonUniversalAgents returns agent-specific dirs', () => {
            const nonUniversal = getNonUniversalAgents();
            expect(nonUniversal).toContain('claude-code');
            expect(nonUniversal).toContain('windsurf');
            expect(nonUniversal).not.toContain('cursor');
        });
    });

    describe('detectAgentInstalled', () => {
        it('returns a boolean for known agents', () => {
            expect(typeof detectAgentInstalled('claude-code')).toBe('boolean');
        });

        it('detectInstalledAgents returns an array', () => {
            const detected = detectInstalledAgents();
            expect(Array.isArray(detected)).toBe(true);
            // Every detected agent is a valid AgentType.
            for (const a of detected) {
                expect(AGENT_NAMES).toContain(a as AgentType);
            }
        });
    });
});
