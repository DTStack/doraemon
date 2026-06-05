/* @vitest-environment node */

import * as fsPromises from "node:fs/promises";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAuthTokenModuleMocks,
  createHttpModuleMocks,
  createRegistryModuleMocks,
  createUiModuleMocks,
  makeGlobalOpts,
} from "../../../test/cliCommandTestKit.js";
import * as skillStore from "../../skills.js";

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    mkdir: fsMocks.mkdir,
    rm: fsMocks.rm,
    stat: fsMocks.stat,
  };
});

const mocked = <T>(value: T) => value as T & Record<string, unknown>;
Object.assign(vi as object, { mocked });

const authTokenMocks = createAuthTokenModuleMocks();
const registryMocks = createRegistryModuleMocks();
const httpMocks = createHttpModuleMocks();
const uiMocks = createUiModuleMocks();
const mockApiRequest = httpMocks.apiRequest;
const mockDownloadZip = httpMocks.downloadZip;
const mockGetOptionalAuthToken = authTokenMocks.getOptionalAuthToken;
const mockSpinner = uiMocks.spinner;
const mockIsInteractive = vi.fn(() => false);
const mockPromptConfirm = vi.fn(async () => false);
const mockSelectAgent = vi.fn(async () => null);
const mockSelectScope = vi.fn(async () => false);

const mockSearchMultiselect = vi.fn();

vi.mock("../../http.js", () => httpMocks.moduleFactory());
vi.mock("../registry.js", () => registryMocks.moduleFactory());
vi.mock("../authToken.js", () => authTokenMocks.moduleFactory());
vi.mock("../ui.js", () => ({
  createSpinner: vi.fn(() => mockSpinner),
  fail: (message: string) => uiMocks.fail(message),
  formatError: (error: unknown) => (error instanceof Error ? error.message : String(error)),
  isInteractive: mockIsInteractive,
  promptConfirm: mockPromptConfirm,
  selectAgent: mockSelectAgent,
  selectScope: mockSelectScope,
}));

vi.mock("../prompts/search-multiselect.js", async () => {
  const actual = await vi.importActual<any>("../prompts/search-multiselect.js");
  return {
    ...actual,
    searchMultiselect: (opts: any) => mockSearchMultiselect(opts),
  };
});

const extractZipToDirMock = vi.spyOn(skillStore, "extractZipToDir");
const hashSkillFilesMock = vi.spyOn(skillStore, "hashSkillFiles");
const listTextFilesMock = vi.spyOn(skillStore, "listTextFiles");
const readLockfileMock = vi.spyOn(skillStore, "readLockfile");
const readSkillOriginMock = vi.spyOn(skillStore, "readSkillOrigin");
const writeLockfileMock = vi.spyOn(skillStore, "writeLockfile");
const writeSkillOriginMock = vi.spyOn(skillStore, "writeSkillOrigin");

const mkdirMock = fsMocks.mkdir;
const rmMock = fsMocks.rm;
const statMock = fsMocks.stat;
const { cmdInstall } = await import("./skills.js");

const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});

function makeOpts() {
  return makeGlobalOpts();
}

beforeEach(() => {
  process.exitCode = undefined;
  mkdirMock.mockResolvedValue(undefined);
  rmMock.mockResolvedValue(undefined);
  statMock.mockRejectedValue(new Error("missing"));
  extractZipToDirMock.mockResolvedValue(undefined);
  hashSkillFilesMock.mockReturnValue({ fingerprint: "hash", files: [] });
  listTextFilesMock.mockResolvedValue([]);
  readLockfileMock.mockResolvedValue({ version: 1, skills: {} });
  readSkillOriginMock.mockResolvedValue(null);
  writeLockfileMock.mockResolvedValue(undefined);
  writeSkillOriginMock.mockResolvedValue(undefined);
  mockGetOptionalAuthToken.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  extractZipToDirMock.mockRestore();
  hashSkillFilesMock.mockRestore();
  listTextFilesMock.mockRestore();
  readLockfileMock.mockRestore();
  readSkillOriginMock.mockRestore();
  writeLockfileMock.mockRestore();
  writeSkillOriginMock.mockRestore();
});

describe("cmdInstall with packages", () => {
  it("installs single non-package skill directly", async () => {
    mockGetOptionalAuthToken.mockResolvedValue("tkn");
    mockApiRequest.mockResolvedValue({
      skill: {
        slug: "single-skill",
        displayName: "Single Skill",
        isPackage: 0,
      },
      latestVersion: { version: "1.0.0" },
    });
    mockDownloadZip.mockResolvedValue(new Uint8Array([1, 2, 3]));

    await cmdInstall(makeOpts(), "single-skill");

    expect(mockApiRequest).toHaveBeenCalledWith(
      "https://clawhub.ai",
      expect.objectContaining({ path: "/api/v1/skills/single-skill" }),
      expect.anything()
    );
    expect(mockDownloadZip).toHaveBeenCalledWith(
      "https://clawhub.ai",
      { slug: "single-skill", version: "1.0.0" }
    );
    expect(extractZipToDirMock).toHaveBeenCalled();
    expect(writeLockfileMock).toHaveBeenCalled();
  });

  it("installs multiple skills in batch", async () => {
    mockGetOptionalAuthToken.mockResolvedValue("tkn");
    mockApiRequest.mockImplementation(async (_registry, request) => {
      const slug = (request as any).path?.split("/").pop();
      return {
        skill: { slug, displayName: slug, isPackage: 0 },
        latestVersion: { version: "1.0.0" },
      };
    });
    mockDownloadZip.mockResolvedValue(new Uint8Array([1, 2, 3]));

    await cmdInstall(makeOpts(), ["skill-a", "skill-b", "skill-c"]);

    expect(mockApiRequest).toHaveBeenCalledTimes(3);
    expect(mockDownloadZip).toHaveBeenCalledTimes(3);
    expect(extractZipToDirMock).toHaveBeenCalledTimes(3);
    expect(writeLockfileMock).toHaveBeenCalledTimes(3);
  });

  it("installs skill when latestVersion is null", async () => {
    mockGetOptionalAuthToken.mockResolvedValue("tkn");
    mockApiRequest.mockResolvedValue({
      skill: {
        slug: "no-version-skill",
        displayName: "No Version Skill",
        isPackage: 0,
      },
      latestVersion: null,
    });
    mockDownloadZip.mockResolvedValue(new Uint8Array([1, 2, 3]));

    await cmdInstall(makeOpts(), "no-version-skill");

    expect(mockApiRequest).toHaveBeenCalledWith(
      "https://clawhub.ai",
      expect.objectContaining({ path: "/api/v1/skills/no-version-skill" }),
      expect.anything()
    );
    expect(mockDownloadZip).toHaveBeenCalledWith(
      "https://clawhub.ai",
      { slug: "no-version-skill", version: "latest" }
    );
    expect(extractZipToDirMock).toHaveBeenCalled();
    expect(writeLockfileMock).toHaveBeenCalled();
  });

  it("continues batch install when one skill fails", async () => {
    mockGetOptionalAuthToken.mockResolvedValue("tkn");
    let callCount = 0;
    mockApiRequest.mockImplementation(async (_registry, request) => {
      callCount++;
      const slug = (request as any).path?.split("/").pop();
      if (slug === "skill-b") {
        throw new Error("not found");
      }
      return {
        skill: { slug, displayName: slug, isPackage: 0 },
        latestVersion: { version: "1.0.0" },
      };
    });
    mockDownloadZip.mockResolvedValue(new Uint8Array([1, 2, 3]));

    await cmdInstall(makeOpts(), ["skill-a", "skill-b", "skill-c"]);

    expect(mockApiRequest).toHaveBeenCalledTimes(3);
    expect(mockDownloadZip).toHaveBeenCalledTimes(2);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Summary"));
    expect(process.exitCode).toBe(1);
  });

  it("continues batch install when fail() is triggered for one skill", async () => {
    mockGetOptionalAuthToken.mockResolvedValue("tkn");
    mockApiRequest.mockImplementation(async (_registry, request) => {
      const slug = (request as any).path?.split("/").pop();
      return {
        skill: { slug, displayName: slug, isPackage: 0 },
        latestVersion: { version: "1.0.0" },
      };
    });
    statMock.mockImplementation(async (path: string) => {
      if (path.includes("skill-b")) {
        return { isFile: () => true, isDirectory: () => false } as any;
      }
      throw new Error("missing");
    });
    mockDownloadZip.mockResolvedValue(new Uint8Array([1, 2, 3]));

    await cmdInstall(makeOpts(), ["skill-a", "skill-b", "skill-c"]);

    expect(mockApiRequest).toHaveBeenCalledTimes(3);
    expect(mockDownloadZip).toHaveBeenCalledTimes(2);
    expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining("Already installed"));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Summary"));
  });

  it("fails if package has no children skills", async () => {
    mockApiRequest.mockResolvedValue({
      skill: {
        slug: "empty-package",
        displayName: "Empty Package",
        isPackage: 1,
        children: [],
      },
      latestVersion: { version: "1.0.0" },
    });

    await expect(cmdInstall(makeOpts(), "empty-package")).rejects.toThrow(
      'Skill package "empty-package" has no children skills.'
    );
  });

  it("installs selected sub-skills from package using searchMultiselect", async () => {
    mockApiRequest.mockResolvedValue({
      skill: {
        slug: "my-package",
        displayName: "My Package",
        isPackage: 1,
        children: [
          { slug: "sub-1", displayName: "Sub 1", version: "1.1.0", summary: "Hint 1" },
          { slug: "sub-2", displayName: "Sub 2", version: "1.2.0", summary: "Hint 2" },
        ],
      },
      latestVersion: { version: "1.0.0" },
    });
    mockDownloadZip.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockSearchMultiselect.mockResolvedValue(["sub-2"]);

    await cmdInstall(makeOpts(), "my-package");

    expect(mockSearchMultiselect).toHaveBeenCalledWith({
      message: 'Select skills from package "my-package" to install:',
      items: [
        { value: "sub-1", label: "Sub 1", hint: "Hint 1" },
        { value: "sub-2", label: "Sub 2", hint: "Hint 2" },
      ],
      required: true,
    });

    expect(mockDownloadZip).toHaveBeenCalledTimes(1);
    expect(mockDownloadZip).toHaveBeenCalledWith(
      "https://clawhub.ai",
      { slug: "sub-2", version: "1.2.0" }
    );

    expect(extractZipToDirMock).toHaveBeenCalledTimes(1);
    expect(writeSkillOriginMock).toHaveBeenCalledTimes(1);
    expect(writeLockfileMock).toHaveBeenCalledTimes(1);
  });

  it("installs all sub-skills when user selects all from package", async () => {
    mockApiRequest.mockResolvedValue({
      skill: {
        slug: "full-package",
        displayName: "Full Package",
        isPackage: 1,
        children: [
          { slug: "child-a", displayName: "Child A", version: "1.0.0" },
          { slug: "child-b", displayName: "Child B", version: "2.0.0" },
          { slug: "child-c", displayName: "Child C", version: "3.0.0" },
        ],
      },
      latestVersion: { version: "1.0.0" },
    });
    mockDownloadZip.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockSearchMultiselect.mockResolvedValue(["child-a", "child-b", "child-c"]);

    await cmdInstall(makeOpts(), "full-package");

    expect(mockDownloadZip).toHaveBeenCalledTimes(3);
    expect(extractZipToDirMock).toHaveBeenCalledTimes(3);
    expect(writeLockfileMock).toHaveBeenCalledTimes(3);
  });

  it("handles user cancellation in searchMultiselect", async () => {
    const { cancelSymbol: realCancelSymbol } = await import("../prompts/search-multiselect.js");
    mockApiRequest.mockResolvedValue({
      skill: {
        slug: "my-package",
        displayName: "My Package",
        isPackage: 1,
        children: [
          { slug: "sub-1", displayName: "Sub 1" },
        ],
      },
      latestVersion: { version: "1.0.0" },
    });
    mockSearchMultiselect.mockResolvedValue(realCancelSymbol);

    await cmdInstall(makeOpts(), "my-package");

    expect(mockLog).toHaveBeenCalledWith("Installation cancelled");
    expect(mockDownloadZip).not.toHaveBeenCalled();
  });

  it("prompts agent only once during batch install", async () => {
    mockIsInteractive.mockReturnValue(true);
    mockSelectAgent.mockResolvedValue({
      agent: "claude-code",
      workdir: "/mock/.claude",
      dir: "/mock/.claude/skills",
    });
    mockGetOptionalAuthToken.mockResolvedValue("tkn");
    mockApiRequest.mockImplementation(async (_registry, request) => {
      const slug = (request as any).path?.split("/").pop();
      return {
        skill: { slug, displayName: slug, isPackage: 0 },
        latestVersion: { version: "1.0.0" },
      };
    });
    mockDownloadZip.mockResolvedValue(new Uint8Array([1, 2, 3]));

    await cmdInstall(makeOpts(), ["skill-a", "skill-b", "skill-c"]);

    expect(mockSelectAgent).toHaveBeenCalledTimes(1);
    expect(mkdirMock).toHaveBeenCalledWith("/mock/.claude/skills", { recursive: true });
    expect(mockDownloadZip).toHaveBeenCalledTimes(3);
  });
});
