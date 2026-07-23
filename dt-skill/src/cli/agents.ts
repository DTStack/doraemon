// Agent logic + compatibility helpers. Configuration lives in ./agents/definitions.ts.
import {
    AGENT_DEFINITIONS,
    AGENT_NAMES,
    type AgentConfig,
    type AgentType,
    detectInstalledAgents,
    getAgentConfig,
    getEveSubagents,
    getNonUniversalAgents,
    getUniversalAgents,
    getVisibleUniversalAgents,
    isAgentType,
    isUniversalAgent,
} from './agents/definitions.js';

export {
    AGENT_DEFINITIONS,
    AGENT_NAMES,
    type AgentConfig,
    type AgentType,
    detectInstalledAgents,
    getAgentConfig,
    getEveSubagents,
    getNonUniversalAgents,
    getUniversalAgents,
    getVisibleUniversalAgents,
    isUniversalAgent,
};

// Legacy alias kept for existing callers/tests.
export type AgentName = AgentType;

export function isAgentName(value: string): value is AgentName {
    return isAgentType(value);
}

export function listAgentNames(): AgentName[] {
    return AGENT_NAMES;
}

export function getAgentLabel(agentName: AgentName): string {
    return AGENT_DEFINITIONS[agentName]?.displayName ?? agentName;
}

/**
 * Returns true when this agent appears installed locally. Delegates to the
 * per-agent detectInstalled() from definitions (checks the real on-disk marker,
 * e.g. ~/.claude, ~/.cursor, $CODEX_HOME).
 */
export function detectAgentInstalled(agentName: AgentName): boolean {
    const config = AGENT_DEFINITIONS[agentName];
    return config ? config.detectInstalled() : false;
}

// Re-export for callers that previously imported AGENTS as a record.
export const AGENTS = AGENT_DEFINITIONS;

// Used by selectScope to decide whether an agent supports global install.
export function supportsGlobalInstall(agentName: AgentName): boolean {
    return AGENT_DEFINITIONS[agentName]?.globalSkillsDir !== undefined;
}
