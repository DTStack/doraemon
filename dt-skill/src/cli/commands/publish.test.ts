/* @vitest-environment node */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {  createHttpModuleMocks,
  createRegistryModuleMocks,
  createUiModuleMocks,
  makeGlobalOpts,
} from "../../../test/cliCommandTestKit.js";
import { MAX_CLAWSCAN_NOTE_CHARS } from "../../schema/index.js";

const registryMocks = createRegistryModuleMocks();
const httpMocks = createHttpModuleMocks();
const uiMocks = createUiModuleMocks({ interactive: true });

const mockSearchMultiselect = vi.fn();

vi.mock("../registry.js", () => registryMocks.moduleFactory());
vi.mock("../../http.js", () => httpMocks.moduleFactory());
vi.mock("../ui.js", () => uiMocks.moduleFactory());
vi.mock("../prompts/search-multiselect.js", async () => {
  const actual = await vi.importActual<any>("../prompts/search-multiselect.js");
  return {
    ...actual,
    searchMultiselect: (opts: any) => mockSearchMultiselect(opts),
  };
});

const { cmdPublish } = await import("./publish");

async function makeTmpWorkdir() {
  const root = await mkdtemp(join(tmpdir(), "dt-skill-publish-"));
  return root;
}

function makeOpts(workdir: string) {
  return makeGlobalOpts(workdir);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("cmdPublish", () => {
  it("publishes SKILL.md from disk (mocked HTTP)", async () => {
    const workdir = await makeTmpWorkdir();
    try {
      const folder = join(workdir, "my-skill");
      await mkdir(folder, { recursive: true });
      const skillContent = "# Skill\n\nHello\n";
      const notesContent = "notes\n";
      await writeFile(join(folder, "SKILL.md"), skillContent, "utf8");
      await writeFile(join(folder, "notes.md"), notesContent, "utf8");

      httpMocks.apiRequestForm.mockResolvedValueOnce({
        ok: true,
        skillId: "skill_1",
        versionId: "ver_1",
      });

      await cmdPublish(makeOpts(workdir), "my-skill", {
        slug: "my-skill",
        name: "My Skill",
        version: "1.0.0",
        changelog: "",
        tags: "latest",
        clawscanNote: "This skill needs network access to call the user's configured API.",
      });

      const publishCall = httpMocks.apiRequestForm.mock.calls.find((call) => {
        const req = call[1] as { path?: string } | undefined;
        return req?.path === "/api/v1/skills";
      });
      if (!publishCall) throw new Error("Missing publish call");
      expect(publishCall[1]).not.toHaveProperty("token");
      const publishForm = (publishCall[1] as { form?: FormData }).form as FormData;
      const payloadEntry = publishForm.get("payload");
      if (typeof payloadEntry !== "string") throw new Error("Missing publish payload");
      const payload = JSON.parse(payloadEntry);
      expect(payload.slug).toBe("my-skill");
      expect(payload.displayName).toBe("My Skill");
      expect(payload.version).toBe("1.0.0");
      expect(payload.changelog).toBe("");
      expect(payload.clawScanNote).toBe(
        "This skill needs network access to call the user's configured API.",
      );
      expect(payload.acceptLicenseTerms).toBe(true);
      expect(payload.tags).toEqual(["latest"]);
      const files = publishForm.getAll("files") as Array<Blob & { name?: string }>;
      expect(files.map((file) => file.name ?? "").sort()).toEqual(["SKILL.md", "notes.md"]);
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  });

  it("发布时同时上传文本文件和二进制资源", async () => {
    const workdir = await makeTmpWorkdir();
    try {
      const folder = join(workdir, "skill-with-assets");
      await mkdir(join(folder, "assets"), { recursive: true });
      await writeFile(join(folder, "SKILL.md"), "# Skill\n", "utf8");
      await writeFile(join(folder, "assets", "logo.png"), new Uint8Array([0, 1, 2, 255]));

      httpMocks.apiRequestForm.mockResolvedValueOnce({
        ok: true,
        skillId: "skill_1",
        versionId: "ver_1",
      });

      await cmdPublish(makeOpts(workdir), "skill-with-assets", {
        version: "1.0.0",
      });

      const publishCall = httpMocks.apiRequestForm.mock.calls[0];
      const publishForm = (publishCall?.[1] as { form?: FormData }).form as FormData;
      const files = publishForm.getAll("files") as Array<Blob & { name?: string }>;
      expect(files.map((file) => file.name ?? "").sort()).toEqual([
        "SKILL.md",
        "assets/logo.png",
      ]);
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  });

  it("rejects oversized clawscan notes before uploading skill files", async () => {
    const workdir = await makeTmpWorkdir();
    try {
      const folder = join(workdir, "oversized-note");
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, "SKILL.md"), "# Skill\n", "utf8");

      await expect(
        cmdPublish(makeOpts(workdir), "oversized-note", {
          slug: "oversized-note",
          name: "Oversized Note",
          version: "1.0.0",
          clawscanNote: "x".repeat(MAX_CLAWSCAN_NOTE_CHARS + 1),
        }),
      ).rejects.toThrow(`ClawScan note must be at most ${MAX_CLAWSCAN_NOTE_CHARS} characters.`);
      expect(httpMocks.apiRequestForm).not.toHaveBeenCalled();
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  });

  it("allows empty changelog when updating an existing skill", async () => {
    const workdir = await makeTmpWorkdir();
    try {
      const folder = join(workdir, "existing-skill");
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, "SKILL.md"), "# Skill\n", "utf8");

      httpMocks.apiRequestForm.mockResolvedValueOnce({
        ok: true,
        skillId: "skill_1",
        versionId: "ver_2",
      });

      await cmdPublish(makeOpts(workdir), "existing-skill", {
        version: "1.0.1",
        changelog: "",
        tags: "latest",
      });

      expect(httpMocks.apiRequestForm).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ path: "/api/v1/skills", method: "POST" }),
        expect.anything(),
      );
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  });

  it("still publishes a root SKILL.md hidden by broad ignore patterns", async () => {
    const workdir = await makeTmpWorkdir();
    try {
      const folder = join(workdir, "ignored-manifest");
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, ".gitignore"), "*.md\n", "utf8");
      await writeFile(join(folder, "SKILL.md"), "# Skill\n", "utf8");
      await writeFile(join(folder, "notes.md"), "ignored notes\n", "utf8");

      httpMocks.apiRequestForm.mockResolvedValueOnce({
        ok: true,
        skillId: "skill_1",
        versionId: "ver_1",
      });

      await cmdPublish(makeOpts(workdir), "ignored-manifest", {
        slug: "ignored-manifest",
        name: "Ignored Manifest",
        version: "1.0.0",
        changelog: "",
        tags: "latest",
      });

      const publishCall = httpMocks.apiRequestForm.mock.calls.find((call) => {
        const req = call[1] as { path?: string } | undefined;
        return req?.path === "/api/v1/skills";
      });
      if (!publishCall) throw new Error("Missing publish call");
      const publishForm = (publishCall[1] as { form?: FormData }).form as FormData;
      const files = publishForm.getAll("files") as Array<Blob & { name?: string }>;
      expect(files.map((file) => file.name ?? "")).toEqual(["SKILL.md"]);
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  });

  it("includes owner handle for org-owned skill publishes", async () => {
    const workdir = await makeTmpWorkdir();
    try {
      const folder = join(workdir, "org-skill");
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, "SKILL.md"), "# Skill\n", "utf8");

      httpMocks.apiRequestForm.mockResolvedValueOnce({
        ok: true,
        skillId: "skill_1",
        versionId: "ver_2",
      });

      await cmdPublish(makeOpts(workdir), "org-skill", {
        owner: "@openclaw",
        migrateOwner: true,
        version: "1.0.1",
        changelog: "",
        tags: "latest",
      });

      const publishCall = httpMocks.apiRequestForm.mock.calls.find((call) => {
        const req = call[1] as { path?: string } | undefined;
        return req?.path === "/api/v1/skills";
      });
      if (!publishCall) throw new Error("Missing publish call");
      const publishForm = (publishCall[1] as { form?: FormData }).form as FormData;
      const payloadEntry = publishForm.get("payload");
      if (typeof payloadEntry !== "string") throw new Error("Missing publish payload");
      const payload = JSON.parse(payloadEntry);
      expect(payload.ownerHandle).toBe("openclaw");
      expect(payload.migrateOwner).toBe(true);
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  });

  it("rejects plugin folders with guidance to use a skill folder", async () => {
    const workdir = await makeTmpWorkdir();
    try {
      const folder = join(workdir, "demo-plugin");
      await mkdir(folder, { recursive: true });
      await writeFile(
        join(folder, "package.json"),
        JSON.stringify({ name: "demo-plugin", openclaw: { extensions: ["./index.ts"] } }),
        "utf8",
      );
      await writeFile(join(folder, "openclaw.plugin.json"), '{"id":"demo-plugin"}', "utf8");

      await expect(
        cmdPublish(makeOpts(workdir), "demo-plugin", {
          slug: "demo-plugin",
          name: "Demo Plugin",
          version: "1.0.0",
          tags: "latest",
        }),
      ).rejects.toThrow(
        "This folder looks like a code plugin, not a skill. Use a folder with SKILL.md.",
      );
      expect(httpMocks.apiRequestForm).not.toHaveBeenCalled();
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  });

  describe("cmdPublish batch mode", () => {
    it("detects multiple skill folders and switches to batch upload (T004)", async () => {
      const workdir = await makeTmpWorkdir();
      try {
        const skillsDir = join(workdir, "skills-batch");
        await mkdir(join(skillsDir, "skill-a"), { recursive: true });
        await mkdir(join(skillsDir, "skill-b"), { recursive: true });
        await writeFile(join(skillsDir, "skill-a", "SKILL.md"), "# Skill A\n", "utf8");
        await writeFile(join(skillsDir, "skill-b", "SKILL.md"), "# Skill B\n", "utf8");

        httpMocks.apiRequestForm.mockResolvedValueOnce({
          success: true,
          data: {
            importedCount: 2,
            refreshedCount: 2,
            importedSkills: [
              { slug: "skill-a", name: "skill-a" },
              { slug: "skill-b", name: "skill-b" },
            ],
          },
        });

        await cmdPublish(makeOpts(workdir), "skills-batch", {
          all: true,
          tags: "latest",
        });

        // Should call /api/skills/import-file, NOT /api/v1/skills
        const batchCall = httpMocks.apiRequestForm.mock.calls.find((call: any[]) => {
          const req = call[1] as { path?: string } | undefined;
          return req?.path === "/api/skills/import-file";
        });
        expect(batchCall).toBeDefined();

        // Should send packageName derived from folder basename
        const form = (batchCall![1] as { form?: FormData }).form as FormData;
        const packageName = form.get("packageName");
        expect(packageName).toBe("skills-batch");
      } finally {
        await rm(workdir, { recursive: true, force: true });
      }
    });

    it("packs selected skills into ZIP with correct structure (T005)", async () => {
      const workdir = await makeTmpWorkdir();
      try {
        const skillsDir = join(workdir, "zip-test");
        await mkdir(join(skillsDir, "alpha"), { recursive: true });
        await mkdir(join(skillsDir, "beta"), { recursive: true });
        await writeFile(join(skillsDir, "alpha", "SKILL.md"), "# Alpha\n", "utf8");
        await writeFile(join(skillsDir, "alpha", "config.json"), "{\"a\":1}", "utf8");
        await writeFile(join(skillsDir, "beta", "SKILL.md"), "# Beta\n", "utf8");

        httpMocks.apiRequestForm.mockResolvedValueOnce({
          success: true,
          data: {
            importedCount: 2,
            refreshedCount: 2,
            importedSkills: [
              { slug: "alpha", name: "alpha" },
              { slug: "beta", name: "beta" },
            ],
          },
        });

        await cmdPublish(makeOpts(workdir), "zip-test", { all: true });

        const batchCall = httpMocks.apiRequestForm.mock.calls.find((call: any[]) => {
          const req = call[1] as { path?: string } | undefined;
          return req?.path === "/api/skills/import-file";
        });
        expect(batchCall).toBeDefined();
        const form = (batchCall![1] as { form?: FormData }).form as FormData;
        const fileEntry = form.get("file");
        expect(fileEntry).toBeDefined();

        // Verify ZIP contents
        const AdmZip = (await import("adm-zip")).default;
        const arrayBuffer = await (fileEntry as Blob).arrayBuffer();
        const zip = new AdmZip(Buffer.from(arrayBuffer));
        const entries = zip.getEntries().map((e: any) => e.entryName);
        expect(entries.some((n: string) => n.includes("alpha"))).toBe(true);
        expect(entries.some((n: string) => n.includes("beta"))).toBe(true);
        expect(entries.some((n: string) => n.includes("SKILL.md"))).toBe(true);

        // ZIP filename should use folder basename
        const batchCall2 = httpMocks.apiRequestForm.mock.calls.find((call: any[]) => {
          const req = call[1] as { path?: string } | undefined;
          return req?.path === "/api/skills/import-file";
        });
        const form2 = (batchCall2![1] as { form?: FormData }).form as FormData;
        const packageName2 = form2.get("packageName");
        expect(packageName2).toBe("zip-test");
      } finally {
        await rm(workdir, { recursive: true, force: true });
      }
    });

    it("calls /api/skills/import-file for batch, not /api/v1/skills (T006)", async () => {
      const workdir = await makeTmpWorkdir();
      try {
        const skillsDir = join(workdir, "api-check");
        await mkdir(join(skillsDir, "x-skill"), { recursive: true });
        await mkdir(join(skillsDir, "y-skill"), { recursive: true });
        await writeFile(join(skillsDir, "x-skill", "SKILL.md"), "# X\n", "utf8");
        await writeFile(join(skillsDir, "y-skill", "SKILL.md"), "# Y\n", "utf8");

        httpMocks.apiRequestForm.mockResolvedValueOnce({
          success: true,
          data: {
            importedCount: 2,
            refreshedCount: 2,
            importedSkills: [],
          },
        });

        await cmdPublish(makeOpts(workdir), "api-check", { all: true });

        const v1Call = httpMocks.apiRequestForm.mock.calls.find((call: any[]) => {
          const req = call[1] as { path?: string } | undefined;
          return req?.path === "/api/v1/skills";
        });
        expect(v1Call).toBeUndefined(); // Should NOT call /api/v1/skills in batch mode
      } finally {
        await rm(workdir, { recursive: true, force: true });
      }
    });

    it("uses searchMultiselect in interactive mode and only uploads selected (T011)", async () => {
      const workdir = await makeTmpWorkdir();
      try {
        const skillsDir = join(workdir, "interactive");
        await mkdir(join(skillsDir, "s1"), { recursive: true });
        await mkdir(join(skillsDir, "s2"), { recursive: true });
        await mkdir(join(skillsDir, "s3"), { recursive: true });
        await writeFile(join(skillsDir, "s1", "SKILL.md"), "# S1\n", "utf8");
        await writeFile(join(skillsDir, "s2", "SKILL.md"), "# S2\n", "utf8");
        await writeFile(join(skillsDir, "s3", "SKILL.md"), "# S3\n", "utf8");

        // User selects only s1 and s3
        mockSearchMultiselect.mockResolvedValue(["s1", "s3"]);

        httpMocks.apiRequestForm.mockResolvedValueOnce({
          success: true,
          data: {
            importedCount: 2,
            refreshedCount: 2,
            importedSkills: [
              { slug: "s1", name: "s1" },
              { slug: "s3", name: "s3" },
            ],
          },
        });

        await cmdPublish(makeOpts(workdir), "interactive", { tags: "latest" });

        expect(mockSearchMultiselect).toHaveBeenCalledWith(
          expect.objectContaining({ message: expect.stringContaining("3 found") }),
        );

        const batchCall = httpMocks.apiRequestForm.mock.calls.find((call: any[]) => {
          const req = call[1] as { path?: string } | undefined;
          return req?.path === "/api/skills/import-file";
        });
        expect(batchCall).toBeDefined();
      } finally {
        await rm(workdir, { recursive: true, force: true });
      }
    });

    it("reports imported count and skill list on success (T014)", async () => {
      const workdir = await makeTmpWorkdir();
      try {
        const skillsDir = join(workdir, "report");
        await mkdir(join(skillsDir, "r1"), { recursive: true });
        await mkdir(join(skillsDir, "r2"), { recursive: true });
        await writeFile(join(skillsDir, "r1", "SKILL.md"), "# R1\n", "utf8");
        await writeFile(join(skillsDir, "r2", "SKILL.md"), "# R2\n", "utf8");

        httpMocks.apiRequestForm.mockResolvedValueOnce({
          success: true,
          data: {
            importedCount: 2,
            refreshedCount: 2,
            importedSkills: [
              { slug: "r1", name: "r1" },
              { slug: "r2", name: "r2" },
            ],
          },
        });

        const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});

        await cmdPublish(makeOpts(workdir), "report", { all: true });

        expect(uiMocks.spinner.succeed).toHaveBeenCalledWith(
          expect.stringContaining("2 skill(s)"),
        );
        expect(mockLog).toHaveBeenCalledWith(
          expect.stringContaining("r1"),
        );

        mockLog.mockRestore();
      } finally {
        await rm(workdir, { recursive: true, force: true });
      }
    });

    it("shows error on upload failure (T015)", async () => {
      const workdir = await makeTmpWorkdir();
      try {
        const skillsDir = join(workdir, "fail-test");
        await mkdir(join(skillsDir, "f1"), { recursive: true });
        await writeFile(join(skillsDir, "f1", "SKILL.md"), "# F1\n", "utf8");

        httpMocks.apiRequestForm.mockRejectedValueOnce(new Error("Network error"));

        await expect(
          cmdPublish(makeOpts(workdir), "fail-test", { all: true }),
        ).rejects.toThrow("Network error");

        expect(uiMocks.spinner.fail).toHaveBeenCalled();
      } finally {
        await rm(workdir, { recursive: true, force: true });
      }
    });
  });
});
