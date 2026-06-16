import { readFile, readdir, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import AdmZip from "adm-zip";
import semver from "semver";
import { apiRequestForm } from "../../http.js";
import {
  ApiRoutes,
  ApiV1PublishResponseSchema,
  normalizeClawScanNote,
} from "../../schema/index.js";
import { listPublishFiles } from "../../skills.js";
import { getRegistry } from "../registry.js";
import { sanitizeSlug, titleCase } from "../slug.js";
import { findSkillFolders } from "../scanSkills.js";
import { searchMultiselect } from "../prompts/search-multiselect.js";
import type { GlobalOpts } from "../types.js";
import { createSpinner, fail, formatError, isInteractive } from "../ui.js";

export async function cmdPublish(
  opts: GlobalOpts,
  folderArg: string,
  options: {
    slug?: string;
    name?: string;
    owner?: string;
    version?: string;
    changelog?: string;
    tags?: string;
    forkOf?: string;
    clawscanNote?: string;
    migrateOwner?: boolean;
    all?: boolean;
    category?: string;
  },
) {
  // Resolve folder path: try workdir first (standard behavior),
  // but fall back to cwd so relative paths work from whichever directory
  // the user runs the command.
  const folder = folderArg
    ? await resolveFolderPath(opts.workdir, folderArg)
    : null;
  if (!folder) fail("Path required");
  const folderStat = await stat(folder).catch(() => null);
  if (!folderStat || !folderStat.isDirectory()) fail("Path must be a folder");
  if (await looksLikePluginFolder(folder)) {
    fail("This folder looks like a code plugin, not a skill. Use a folder with SKILL.md.");
  }

  // Detect batch mode: if folder does NOT contain SKILL.md directly,
  // but contains subdirectories with SKILL.md, switch to batch upload
  const directSkillMd = await stat(join(folder, "SKILL.md")).catch(() => null);
  if (!directSkillMd?.isFile()) {
    const skillFolders = await findSkillFolders(folder);
    if (skillFolders.length > 0) {
      return cmdPublishBatch(opts, folder, skillFolders, options);
    }
  }

  // Single skill mode (existing logic)
  const registry = await getRegistry(opts, { cache: true });

  const slug = options.slug ?? sanitizeSlug(basename(folder));
  const displayName = options.name ?? titleCase(basename(folder));
  const ownerHandle = options.owner?.trim().replace(/^@+/, "");
  const version = options.version;
  const changelog = options.changelog ?? "";
  let clawScanNote: string | undefined;
  try {
    clawScanNote = normalizeClawScanNote(options.clawscanNote);
  } catch (error) {
    fail(formatError(error));
  }
  const tagsValue = options.tags ?? "latest";
  const tags = tagsValue
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const forkOfRaw = options.forkOf?.trim();
  const forkOf = forkOfRaw ? parseForkOf(forkOfRaw) : undefined;

  if (!slug) fail("--slug required");
  if (!displayName) fail("--name required");
  if (!version || !semver.valid(version)) fail("--version must be valid semver");

  const spinner = createSpinner(`Preparing ${slug}@${version}`);
  try {
    const filesOnDisk = await ensureRootManifestFile(folder, await listPublishFiles(folder));
    if (filesOnDisk.length === 0) fail("No files found");
    if (
      !filesOnDisk.some((file) => {
        const lower = file.relPath.toLowerCase();
        return lower === "skill.md" || lower === "skills.md";
      })
    ) {
      fail("SKILL.md required");
    }

    const form = new FormData();
    form.set(
      "payload",
      JSON.stringify({
        slug,
        displayName,
        ...(ownerHandle ? { ownerHandle } : {}),
        ...(options.migrateOwner ? { migrateOwner: true } : {}),
        version,
        changelog,
        ...(clawScanNote ? { clawScanNote } : {}),
        acceptLicenseTerms: true,
        tags,
        ...(forkOf ? { forkOf } : {}),
      }),
    );

    let index = 0;
    for (const file of filesOnDisk) {
      index += 1;
      spinner.text = `Uploading ${file.relPath} (${index}/${filesOnDisk.length})`;
      const blob = new Blob([Buffer.from(file.bytes)], { type: file.contentType ?? "text/plain" });
      form.append("files", blob, file.relPath);
    }

    spinner.text = `Publishing ${slug}@${version}`;
    const result = await apiRequestForm(
      registry,
      { method: "POST", path: ApiRoutes.skills, form },
      ApiV1PublishResponseSchema,
    );

    spinner.succeed(`OK. Published ${slug}@${version} (${result.versionId})`);
  } catch (error) {
    spinner.fail(formatError(error));
    throw error;
  }
}

async function ensureRootManifestFile(
  folder: string,
  files: Awaited<ReturnType<typeof listPublishFiles>>,
) {
  if (
    files.some((file) => {
      const lower = file.relPath.toLowerCase();
      return lower === "skill.md" || lower === "skills.md";
    })
  ) {
    return files;
  }

  const entries = await readdir(folder, { withFileTypes: true }).catch(() => []);
  const manifest = entries.find((entry) => {
    const lower = entry.name.toLowerCase();
    return entry.isFile() && (lower === "skill.md" || lower === "skills.md");
  });
  if (!manifest) return files;

  return [
    ...files,
    {
      relPath: manifest.name,
      bytes: new Uint8Array(await readFile(join(folder, manifest.name))),
      contentType: "text/markdown",
    },
  ];
}

async function looksLikePluginFolder(folder: string) {
  const checks = [
    join(folder, "openclaw.plugin.json"),
    join(folder, "package.json"),
    join(folder, ".codex-plugin", "plugin.json"),
    join(folder, ".claude-plugin", "plugin.json"),
    join(folder, ".cursor-plugin", "plugin.json"),
  ];
  const stats = await Promise.all(checks.map((candidate) => stat(candidate).catch(() => null)));
  if (stats[0]?.isFile() || stats[2]?.isFile() || stats[3]?.isFile() || stats[4]?.isFile()) {
    return true;
  }
  if (!stats[1]?.isFile()) {
    return false;
  }
  try {
    const raw = JSON.parse(await readFile(checks[1], "utf8")) as { openclaw?: unknown };
    return Boolean(
      raw && typeof raw === "object" && raw.openclaw && typeof raw.openclaw === "object",
    );
  } catch {
    return false;
  }
}

function parseForkOf(value: string) {
  const trimmed = value.trim();
  const [slugRaw, versionRaw] = trimmed.split("@");
  const slug = (slugRaw ?? "").trim().toLowerCase();
  if (!slug) fail("--fork-of must be <slug> or <slug@version>");
  const version = (versionRaw ?? "").trim();
  if (version && !semver.valid(version)) fail("--fork-of version must be valid semver");
  return { slug, version: version || undefined };
}

export async function cmdPublishBatch(
  opts: GlobalOpts,
  folder: string,
  discoveredSkills: Array<{ folder: string; slug: string; displayName: string }>,
  options: {
    all?: boolean;
    category?: string;
    tags?: string;
    name?: string;
  },
) {
  const registry = await getRegistry(opts, { cache: true });

  let selectedSkills = discoveredSkills;

  // Interactive selection when not --all and terminal supports interaction
  if (!options.all && isInteractive()) {
    const items = discoveredSkills.map((s) => ({
      value: s.slug,
      label: s.displayName,
      hint: s.folder.split("/").pop() ?? "",
    }));
    const selected = await searchMultiselect({
      message: `Select skills to publish (${discoveredSkills.length} found):`,
      items,
      required: true,
    });

    if (typeof selected === "symbol") {
      console.log("Upload cancelled");
      return;
    }

    const selectedSlugs = selected as string[];
    selectedSkills = discoveredSkills.filter((s) => selectedSlugs.includes(s.slug));

    if (selectedSkills.length === 0) {
      console.log("No skills selected");
      return;
    }
  }

  // Derive package name from folder basename (e.g. "demo-multi-skill-folders")
  const packageBaseName = options.name?.trim() || basename(folder);
  const zipFileName = `${packageBaseName}.zip`;

  // Pack selected skills into a ZIP
  const spinner = createSpinner(
    `Packing ${selectedSkills.length} skill(s) into ZIP`,
  );
  const zip = new AdmZip();

  for (const skill of selectedSkills) {
    zip.addLocalFolder(skill.folder, skill.slug);
  }

  const zipBuffer = zip.toBuffer();
  spinner.text = `Uploading ${selectedSkills.length} skill(s) as ${zipFileName}`;

  // Upload via /api/skills/import-file
  try {
    const form = new FormData();
    const blob = new Blob([zipBuffer], { type: "application/zip" });
    form.set("file", blob, zipFileName);
    if (packageBaseName) form.set("packageName", packageBaseName);
    if (options.category) form.set("category", options.category);
    if (options.tags) form.set("tags", options.tags);

    const result = await apiRequestForm<{
      success: boolean;
      data: {
        importedCount: number;
        refreshedCount: number;
        importedSkills: Array<{ slug: string; name: string }>;
      };
    }>(registry, {
      method: "POST",
      path: "/api/skills/import-file",
      form,
    });

    const data = result.data;
    spinner.succeed(
      `✓ Uploaded ${data.importedCount} skill(s)` +
        (data.importedCount > 1 ? ` (package created)` : ""),
    );

    for (const skill of data.importedSkills) {
      console.log(`  - ${skill.name} (${skill.slug})`);
    }
  } catch (error) {
    spinner.fail(formatError(error));
    throw error;
  }
}

/**
 * Resolve folder argument: try workdir-relative first, then cwd-relative.
 * This ensures `dt-skill publish ./my-folder` works regardless of whether
 * workdir points to a clawdbot workspace or cwd.
 */
async function resolveFolderPath(workdir: string, folderArg: string): Promise<string> {
  const fromWorkdir = resolve(workdir, folderArg);
  const workdirStat = await stat(fromWorkdir).catch(() => null);
  if (workdirStat?.isDirectory()) return fromWorkdir;

  const fromCwd = resolve(process.cwd(), folderArg);
  const cwdStat = await stat(fromCwd).catch(() => null);
  if (cwdStat?.isDirectory()) return fromCwd;

  // Return the workdir-relative path so the original "Path must be a folder" error fires
  return fromWorkdir;
}
