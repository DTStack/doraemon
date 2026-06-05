import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";

describe("install command argument parsing", () => {
  it("accepts multiple skill slugs via variadic argument", async () => {
    const program = new Command();
    const installAction = vi.fn();

    program
      .command("install <slugs...>")
      .description("Install skill(s)")
      .action(installAction);

    await program.parseAsync(["node", "dt-skill", "install", "skill-a", "skill-b", "skill-c"]);

    expect(installAction).toHaveBeenCalledTimes(1);
    const receivedSlugs = installAction.mock.calls[0][0];
    expect(Array.isArray(receivedSlugs)).toBe(true);
    expect(receivedSlugs).toEqual(["skill-a", "skill-b", "skill-c"]);
  });

  it("accepts a single skill slug", async () => {
    const program = new Command();
    const installAction = vi.fn();

    program
      .command("install <slugs...>")
      .description("Install skill(s)")
      .action(installAction);

    await program.parseAsync(["node", "dt-skill", "install", "single-skill"]);

    expect(installAction).toHaveBeenCalledTimes(1);
    const receivedSlugs = installAction.mock.calls[0][0];
    expect(Array.isArray(receivedSlugs)).toBe(true);
    expect(receivedSlugs).toEqual(["single-skill"]);
  });
});
