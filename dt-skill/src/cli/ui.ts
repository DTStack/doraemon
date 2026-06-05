import { spawn } from "node:child_process";
import { stdin } from "node:process";
import { confirm, isCancel, select } from "@clack/prompts";
import ora from "ora";
import { listAgentNames, getAgentLabel, resolveAgentWorkdir, AGENTS } from "./agents.js";
import type { AgentName } from "./agents.js";

export async function promptHidden(prompt: string) {
  if (!stdin.isTTY) return "";
  process.stdout.write(prompt);
  const chunks: Buffer[] = [];
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise<string>((resolvePromise) => {
    function onData(data: Buffer) {
      const text = data.toString("utf8");
      if (text === "\r" || text === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        process.stdout.write("\n");
        resolvePromise(Buffer.concat(chunks).toString("utf8").trim());
        return;
      }
      if (text === "\u0003") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        process.stdout.write("\n");
        fail("Canceled");
      }
      if (text === "\u007f") {
        chunks.pop();
        return;
      }
      chunks.push(data);
    }
    stdin.on("data", onData);
  });
}

export async function promptConfirm(prompt: string) {
  const answer = await confirm({ message: prompt });
  if (isCancel(answer)) return false;
  return answer;
}

export function openInBrowser(url: string) {
  const args =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["explorer", url]
        : ["xdg-open", url];
  const [command, ...commandArgs] = args;
  if (!command) return;

  const child = spawn(command, commandArgs, { stdio: "ignore", detached: true });

  child.on("error", (err) => {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("");
      console.log("Could not open browser automatically.");
      console.log("Please open this URL manually:");
      console.log("");
      console.log(`  ${url}`);
      console.log("");
    }
  });

  child.unref();
}

export function isInteractive() {
  return process.stdout.isTTY && stdin.isTTY;
}

export function createSpinner(text: string) {
  return ora({ text, spinner: "dots", isEnabled: isInteractive() }).start();
}

export function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function fail(message: string): never {
  throw new Error(message);
}

export async function selectAgent(): Promise<{ agent: AgentName; workdir: string; dir: string } | null> {
  if (!isInteractive()) return null;

  const names = listAgentNames();
  const options = names.map((name) => ({
    value: name,
    label: getAgentLabel(name),
  }));

  const selected = await select({
    message: "Select target agent:",
    options,
  });

  if (isCancel(selected)) return null;
  const agent = selected as AgentName;
  const workdir = resolveAgentWorkdir(agent, false);
  const dir = `${workdir}/skills`;
  return { agent, workdir, dir };
}

export async function selectScope(agent: AgentName): Promise<boolean | null> {
  if (!isInteractive()) return null;

  // Check if the selected agent supports global installation
  const supportsGlobal = AGENTS[agent].globalWorkdir !== undefined;
  if (!supportsGlobal) return false;

  const scope = await select({
    message: "安装范围",
    options: [
      {
        value: false,
        label: "Project",
        hint: "在当前目录安装（随项目提交）",
      },
      {
        value: true,
        label: "Global",
        hint: "在 home 目录安装（跨项目可用）",
      },
    ],
  });

  if (isCancel(scope)) return null;
  return scope as boolean;
}
