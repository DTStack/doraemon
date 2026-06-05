import { join } from "node:path";
import { resolveHome } from "../homedir.js";

export const AGENTS = {
  "claude-code": {
    name: "claude-code",
    label: "Claude Code",
    projectWorkdir: ".claude",
    globalWorkdir: "~/.claude",
  },
  codex: {
    name: "codex",
    label: "Codex",
    projectWorkdir: ".codex",
    globalWorkdir: "~/.codex",
  },
  cursor: {
    name: "cursor",
    label: "Cursor",
    projectWorkdir: ".cursor",
    globalWorkdir: "~/.cursor",
  },
} as const;

export type AgentName = keyof typeof AGENTS;

export function isAgentName(value: string): value is AgentName {
  return value in AGENTS;
}

export function listAgentNames(): AgentName[] {
  return Object.keys(AGENTS) as AgentName[];
}

function resolveTilde(path: string): string {
  if (path.startsWith("~/")) {
    return join(resolveHome(), path.slice(2));
  }
  return path;
}

export function resolveAgentWorkdir(agentName: AgentName, isGlobal: boolean): string {
  const agent = AGENTS[agentName];
  if (!agent) throw new Error(`Unknown agent: ${agentName}`);
  const raw = isGlobal ? agent.globalWorkdir : agent.projectWorkdir;
  return resolveTilde(raw);
}

export function getAgentLabel(agentName: AgentName): string {
  return AGENTS[agentName]?.label ?? agentName;
}
