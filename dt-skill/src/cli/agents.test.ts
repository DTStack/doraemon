import { describe, expect, it } from "vitest";
import {
  AGENTS,
  getAgentLabel,
  isAgentName,
  listAgentNames,
  resolveAgentWorkdir,
} from "./agents.js";

describe("agents", () => {
  describe("isAgentName", () => {
    it("returns true for known agents", () => {
      expect(isAgentName("claude-code")).toBe(true);
      expect(isAgentName("codex")).toBe(true);
      expect(isAgentName("cursor")).toBe(true);
    });

    it("returns false for unknown agents", () => {
      expect(isAgentName("unknown")).toBe(false);
      expect(isAgentName("")).toBe(false);
    });
  });

  describe("listAgentNames", () => {
    it("returns all agent names", () => {
      const names = listAgentNames();
      expect(names).toContain("claude-code");
      expect(names).toContain("codex");
      expect(names).toContain("cursor");
    });
  });

  describe("getAgentLabel", () => {
    it("returns the label for known agents", () => {
      expect(getAgentLabel("claude-code")).toBe("Claude Code");
      expect(getAgentLabel("codex")).toBe("Codex");
      expect(getAgentLabel("cursor")).toBe("Cursor");
    });
  });

  describe("resolveAgentWorkdir", () => {
    it("resolves project workdir", () => {
      const dir = resolveAgentWorkdir("claude-code", false);
      expect(dir).toMatch(/\.claude$/);
    });

    it("resolves global workdir with tilde", () => {
      const dir = resolveAgentWorkdir("claude-code", true);
      expect(dir).not.toContain("~");
      expect(dir).toMatch(/\.claude$/);
    });

    it("resolves codex project workdir", () => {
      const dir = resolveAgentWorkdir("codex", false);
      expect(dir).toMatch(/\.codex$/);
    });

    it("resolves cursor global workdir", () => {
      const dir = resolveAgentWorkdir("cursor", true);
      expect(dir).not.toContain("~");
      expect(dir).toMatch(/\.cursor$/);
    });
  });

  describe("AGENTS config", () => {
    it("has consistent structure for all agents", () => {
      for (const [key, agent] of Object.entries(AGENTS)) {
        expect(agent.name).toBe(key);
        expect(agent.label).toBeTruthy();
        expect(agent.projectWorkdir).toBeTruthy();
        expect(agent.globalWorkdir).toMatch(/^~/);
      }
    });
  });
});
