import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import semver from "semver";
import { parseClawPack } from "../../clawpack.js";
import { apiRequest, fetchBinary, fetchText, registryUrl } from "../../http.js";
import {
  ApiRoutes,
  ApiV1PackageArtifactResponseSchema,
  ApiV1PackageListResponseSchema,
  ApiV1PackageReadinessResponseSchema,
  ApiV1PackageResponseSchema,
  ApiV1PackageSearchResponseSchema,
  ApiV1PackageVersionListResponseSchema,
  ApiV1PackageVersionResponseSchema,
  type PackageArtifactSummary,
  type PackageCapabilitySummary,
  type PackageCompatibility,
  type PackageFamily,
  type PackageVerificationSummary,
  validateOpenClawExternalCodePluginPackageContents,
  validateOpenClawExternalCodePluginPackageJson,
} from "../../schema/index.js";
import { getRegistry } from "../registry.js";
import type { GlobalOpts } from "../types.js";
import { createSpinner, fail, formatError } from "../ui.js";
import { resolveSourceInput } from "./github.js";

const MAX_CLAWPACK_BYTES = 120 * 1024 * 1024;

type PackageInspectOptions = {
  version?: string;
  tag?: string;
  versions?: boolean;
  limit?: number;
  files?: boolean;
  file?: string;
  json?: boolean;
};

type PackageExploreOptions = {
  family?: PackageFamily;
  official?: boolean;
  executesCode?: boolean;
  target?: string;
  os?: string;
  arch?: string;
  libc?: string;
  requiresBrowser?: boolean;
  requiresDesktop?: boolean;
  requiresNativeDeps?: boolean;
  requiresExternalService?: boolean;
  externalService?: string;
  binary?: string;
  osPermission?: string;
  artifactKind?: "legacy-zip" | "npm-pack";
  npmMirror?: boolean;
  limit?: number;
  json?: boolean;
};

type PackagePackOptions = {
  packDestination?: string;
  json?: boolean;
};

type PackageDownloadOptions = {
  version?: string;
  tag?: string;
  output?: string;
  force?: boolean;
  json?: boolean;
};

type PackageVerifyOptions = {
  packageName?: string;
  version?: string;
  tag?: string;
  sha256?: string;
  npmIntegrity?: string;
  npmShasum?: string;
  json?: boolean;
};

type PackageReadinessOptions = {
  json?: boolean;
};

type PackageMigrationStatusOptions = PackageReadinessOptions;

type PackageFile = {
  relPath: string;
  bytes: Uint8Array;
  contentType?: string;
};

type PackedClawPack = {
  path: string;
  file: PackageFile;
  parsed: ReturnType<typeof parseClawPack>;
  identity: ArtifactIdentity;
};

function appendPackageExploreFilters(url: URL, options: PackageExploreOptions) {
  if (options.target) url.searchParams.set("target", options.target);
  if (options.os) url.searchParams.set("os", options.os);
  if (options.arch) url.searchParams.set("arch", options.arch);
  if (options.libc) url.searchParams.set("libc", options.libc);
  if (options.requiresBrowser) url.searchParams.set("requiresBrowser", "true");
  if (options.requiresDesktop) url.searchParams.set("requiresDesktop", "true");
  if (options.requiresNativeDeps) url.searchParams.set("requiresNativeDeps", "true");
  if (options.requiresExternalService) url.searchParams.set("requiresExternalService", "true");
  if (options.externalService) url.searchParams.set("externalService", options.externalService);
  if (options.binary) url.searchParams.set("binary", options.binary);
  if (options.osPermission) url.searchParams.set("osPermission", options.osPermission);
  if (options.artifactKind) url.searchParams.set("artifactKind", options.artifactKind);
  if (options.npmMirror) url.searchParams.set("npmMirror", "true");
}

type PrintableFile = {
  path: string;
  size: number | null;
  sha256: string | null;
  contentType: string | null;
};

type PackageResponse = Awaited<ReturnType<typeof apiRequestPackageDetail>>;
type PackageVersionResponse = Awaited<ReturnType<typeof apiRequestPackageVersion>>;
type PackageArtifactResponse = Awaited<ReturnType<typeof apiRequestPackageArtifact>>;
type ArtifactIdentity = {
  sha256: string;
  npmIntegrity: string;
  npmShasum: string;
  byteLength: number;
};

export async function cmdExplorePackages(
  opts: GlobalOpts,
  query: string,
  options: PackageExploreOptions = {},
) {
  const trimmedQuery = query.trim();
  const registry = await getRegistry(opts, { cache: true });
  const spinner = createSpinner(trimmedQuery ? "Searching packages" : "Listing packages");
  try {
    const limit = clampLimit(options.limit ?? 25, 100);
    if (trimmedQuery) {
      const url = registryUrl(`${ApiRoutes.packages}/search`, registry);
      url.searchParams.set("q", trimmedQuery);
      url.searchParams.set("limit", String(limit));
      if (options.family) url.searchParams.set("family", options.family);
      if (options.official) url.searchParams.set("isOfficial", "true");
      if (typeof options.executesCode === "boolean") {
        url.searchParams.set("executesCode", String(options.executesCode));
      }
      appendPackageExploreFilters(url, options);
      const result = await apiRequest(
        registry,
        { method: "GET", url: url.toString() },
        ApiV1PackageSearchResponseSchema,
      );
      spinner.stop();
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      if (result.results.length === 0) {
        console.log("No packages found.");
        return;
      }
      for (const entry of result.results) {
        console.log(formatPackageLine(entry.package));
      }
      return;
    }

    const route =
      options.family === "code-plugin"
        ? ApiRoutes.codePlugins
        : options.family === "bundle-plugin"
          ? ApiRoutes.bundlePlugins
          : ApiRoutes.packages;
    const url = registryUrl(route, registry);
    url.searchParams.set("limit", String(limit));
    if (options.family === "skill") url.searchParams.set("family", "skill");
    if (options.official) url.searchParams.set("isOfficial", "true");
    if (typeof options.executesCode === "boolean") {
      url.searchParams.set("executesCode", String(options.executesCode));
    }
    appendPackageExploreFilters(url, options);
    const result = await apiRequest(
      registry,
      { method: "GET", url: url.toString() },
      ApiV1PackageListResponseSchema,
    );
    spinner.stop();
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (result.items.length === 0) {
      console.log("No packages found.");
      return;
    }
    for (const item of result.items) {
      console.log(formatPackageLine(item));
    }
  } catch (error) {
    spinner.fail(formatError(error));
    throw error;
  }
}

export async function cmdInspectPackage(
  opts: GlobalOpts,
  packageName: string,
  options: PackageInspectOptions = {},
) {
  const trimmed = normalizePackageNameOrFail(packageName);
  if (options.version && options.tag) fail("Use either --version or --tag");
  const registry = await getRegistry(opts, { cache: true });
  const spinner = createSpinner("Fetching package");
  try {
    const detail = await apiRequestPackageDetail(registry, trimmed);
    if (!detail.package) {
      spinner.fail("Package not found");
      return;
    }

    const tags = normalizeTags(detail.package.tags);
    const latestVersion = detail.package.latestVersion ?? tags.latest ?? null;
    const taggedVersion = options.tag ? (tags[options.tag] ?? null) : null;
    if (options.tag && !taggedVersion) {
      spinner.fail(`Unknown tag "${options.tag}"`);
      return;
    }
    const requestedVersion = options.version ?? taggedVersion ?? null;

    let versionResult: PackageVersionResponse | null = null;
    if (options.files || options.file || options.version || options.tag) {
      const targetVersion = requestedVersion ?? latestVersion;
      if (!targetVersion) fail("Could not resolve latest version");
      spinner.text = `Fetching ${trimmed}@${targetVersion}`;
      versionResult = await apiRequestPackageVersion(registry, trimmed, targetVersion);
    }

    let versionsList: Awaited<ReturnType<typeof apiRequestPackageVersions>> | null = null;
    if (options.versions) {
      const limit = clampLimit(options.limit ?? 25, 100);
      spinner.text = `Fetching versions (${limit})`;
      versionsList = await apiRequestPackageVersions(registry, trimmed, limit);
    }

    let fileContent: string | null = null;
    if (options.file) {
      const url = registryUrl(
        `${ApiRoutes.packages}/${encodeURIComponent(trimmed)}/file`,
        registry,
      );
      url.searchParams.set("path", options.file);
      if (options.version) {
        url.searchParams.set("version", options.version);
      } else if (options.tag) {
        url.searchParams.set("tag", options.tag);
      } else if (latestVersion) {
        url.searchParams.set("version", latestVersion);
      }
      spinner.text = `Fetching ${options.file}`;
      fileContent = await fetchText(registry, { url: url.toString() });
    }

    spinner.stop();

    const output = {
      package: detail.package,
      owner: detail.owner,
      version: versionResult?.version ?? null,
      versions: versionsList?.items ?? null,
      file: options.file ? { path: options.file, content: fileContent } : null,
    };

    if (options.json) {
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    const shouldPrintMeta = !options.file || options.files || options.versions || options.version;
    if (shouldPrintMeta) {
      printPackageSummary(detail);
    }

    if (shouldPrintMeta && versionResult?.version) {
      printVersionSummary(versionResult.version);
      printCompatibility(
        versionResult.version.compatibility ?? detail.package.compatibility ?? null,
      );
      printCapabilities(versionResult.version.capabilities ?? detail.package.capabilities ?? null);
      printVerification(versionResult.version.verification ?? detail.package.verification ?? null);
      printArtifact(versionResult.version.artifact ?? detail.package.artifact ?? null);
    } else if (shouldPrintMeta) {
      printCompatibility(detail.package.compatibility ?? null);
      printCapabilities(detail.package.capabilities ?? null);
      printVerification(detail.package.verification ?? null);
      printArtifact(detail.package.artifact ?? null);
    }

    if (versionsList?.items) {
      if (versionsList.items.length === 0) {
        console.log("No versions found.");
      } else {
        console.log("Versions:");
        for (const item of versionsList.items) {
          console.log(`- ${item.version}  ${formatTimestamp(item.createdAt)}`);
        }
      }
    }

    if (versionResult?.version && options.files) {
      const files = normalizeFiles(versionResult.version.files);
      if (files.length === 0) {
        console.log("No files found.");
      } else {
        console.log("Files:");
        for (const file of files) {
          console.log(formatFileLine(file));
        }
      }
    }

    if (options.file && fileContent !== null) {
      if (shouldPrintMeta) console.log(`\n${options.file}:\n`);
      process.stdout.write(fileContent);
      if (!fileContent.endsWith("\n")) process.stdout.write("\n");
    }
  } catch (error) {
    spinner.fail(formatError(error));
    throw error;
  }
}

export async function cmdPackPackage(
  opts: GlobalOpts,
  sourceArg: string,
  options: PackagePackOptions = {},
) {
  if (!sourceArg?.trim()) fail("Path required");
  const resolvedSource = await resolveSourceInput(sourceArg, {
    workdir: opts.workdir,
    localWorkdirs: [process.cwd(), opts.workdir],
  });
  if (resolvedSource.kind !== "local") fail("Path must be a package folder");
  const sourcePath = resolvedSource.path;
  const sourceStat = await stat(sourcePath).catch(() => null);
  if (!sourceStat?.isDirectory()) fail("Path must be a package folder");

  const packageJson = await readJsonFile(join(sourcePath, "package.json"));
  if (!packageJson) fail("package.json required");
  const pluginManifest = await readJsonFile(join(sourcePath, "openclaw.plugin.json"));
  if (!pluginManifest) fail("openclaw.plugin.json required");

  const packageName = packageJsonString(packageJson, "name");
  const packageVersion = packageJsonString(packageJson, "version");
  if (!packageName) fail("package.json name required");
  if (!packageVersion) fail("package.json version required");
  if (!semver.valid(packageVersion)) fail("package.json version must be valid semver");

  const validation = validateOpenClawExternalCodePluginPackageJson(packageJson);
  if (validation.issues.length > 0) {
    fail(validation.issues.map((issue) => issue.message).join(" "));
  }

  const packDestination = resolve(opts.workdir, options.packDestination ?? ".");
  await mkdir(packDestination, { recursive: true });

  const spinner = options.json ? null : createSpinner(`Packing ${packageName}@${packageVersion}`);
  try {
    const packed = await createClawPackFromFolder({
      sourcePath,
      packDestination,
      cwd: opts.workdir,
    });
    const contentValidation = validateOpenClawExternalCodePluginPackageContents(
      packed.parsed.packageJson,
      packed.parsed.entries.map((entry) => entry.path),
    );
    if (contentValidation.issues.length > 0) {
      fail(contentValidation.issues.map((issue) => issue.message).join(" "));
    }
    const output = {
      path: packed.path,
      name: packed.parsed.packageName,
      version: packed.parsed.packageVersion,
      size: packed.file.bytes.byteLength,
      files: packed.parsed.entries.length,
      sha256: packed.identity.sha256,
      npmIntegrity: packed.identity.npmIntegrity,
      npmShasum: packed.identity.npmShasum,
    };

    spinner?.succeed(
      `Packed ${packed.parsed.packageName}@${packed.parsed.packageVersion} -> ${packed.path}`,
    );
    if (options.json) {
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    } else {
      console.log(`Path: ${packed.path}`);
      console.log(`Size: ${packed.file.bytes.byteLength} bytes`);
      console.log(`SHA-256: ${packed.identity.sha256}`);
      console.log(`npm integrity: ${packed.identity.npmIntegrity}`);
    }
  } catch (error) {
    spinner?.fail(formatError(error));
    throw error;
  }
}

async function createClawPackFromFolder(options: {
  sourcePath: string;
  packDestination: string;
  cwd: string;
}): Promise<PackedClawPack> {
  const result = spawnSync(
    "npm",
    [
      "pack",
      options.sourcePath,
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      options.packDestination,
    ],
    {
      cwd: options.cwd,
      encoding: "utf8",
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    fail((result.stderr || result.stdout || "npm pack failed").trim());
  }

  let npmOutput: Array<{ filename?: string }> = [];
  try {
    npmOutput = JSON.parse(result.stdout) as Array<{ filename?: string }>;
  } catch {
    fail("npm pack did not return JSON output");
  }
  const filename = npmOutput[0]?.filename;
  if (!filename) fail("npm pack did not return a tarball filename");

  const packPath = resolve(options.packDestination, filename);
  const bytes = new Uint8Array(await readFile(packPath));
  assertClawPackSize(bytes.byteLength, basename(packPath));
  const parsed = parseClawPack(bytes);
  return {
    path: packPath,
    file: {
      relPath: basename(packPath),
      bytes,
      contentType: "application/octet-stream",
    },
    parsed,
    identity: computeArtifactIdentity(bytes),
  };
}

export async function cmdDownloadPackage(
  opts: GlobalOpts,
  packageName: string,
  options: PackageDownloadOptions = {},
) {
  const trimmed = normalizePackageNameOrFail(packageName);
  if (options.version && options.tag) fail("Use either --version or --tag");
  const registry = await getRegistry(opts, { cache: true });
  const spinner = options.json ? null : createSpinner("Resolving package artifact");
  try {
    const targetVersion = await resolvePackageVersion(registry, trimmed, {
      version: options.version,
      tag: options.tag,
    });
    spinnerText(spinner, `Resolving ${trimmed}@${targetVersion}`);
    const artifactResult = await apiRequestPackageArtifact(registry, trimmed, targetVersion);
    spinnerText(spinner, `Downloading ${trimmed}@${targetVersion}`);
    const bytes = await fetchBinary(registry, {
      url: artifactResult.artifact.downloadUrl,
    });
    const identity = computeArtifactIdentity(bytes);
    validateDownloadedArtifact(trimmed, artifactResult, bytes, identity);

    const filename = defaultArtifactFilename(trimmed, targetVersion, artifactResult.artifact);
    const outputPath = await resolveArtifactOutputPath(opts, options.output, filename);
    await assertOutputWritable(outputPath, Boolean(options.force));
    await writeFile(outputPath, bytes);
    spinner?.stop();

    const output = {
      package: artifactResult.package.name,
      version: targetVersion,
      artifact: artifactResult.artifact,
      path: outputPath,
      bytes: bytes.byteLength,
      sha256: identity.sha256,
      npmIntegrity: artifactResult.artifact.kind === "npm-pack" ? identity.npmIntegrity : undefined,
      npmShasum: artifactResult.artifact.kind === "npm-pack" ? identity.npmShasum : undefined,
    };
    if (options.json) {
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
      return;
    }
    console.log(`Downloaded ${artifactResult.package.name}@${targetVersion} -> ${outputPath}`);
    console.log(`Artifact: ${artifactResult.artifact.kind}`);
    console.log(`SHA-256: ${identity.sha256}`);
    if (artifactResult.artifact.kind === "npm-pack") {
      console.log(`npm integrity: ${identity.npmIntegrity}`);
      console.log(`npm shasum: ${identity.npmShasum}`);
    }
  } catch (error) {
    spinner?.fail(formatError(error));
    throw error;
  }
}

export async function cmdVerifyPackage(
  opts: GlobalOpts,
  filePath: string,
  options: PackageVerifyOptions = {},
) {
  const targetFile = resolve(opts.workdir, filePath);
  if (options.version && options.tag) fail("Use either --version or --tag");
  if ((options.version || options.tag) && !options.packageName?.trim()) {
    fail("--package is required with --version or --tag");
  }

  const spinner = options.json ? null : createSpinner("Reading artifact");
  try {
    const bytes = new Uint8Array(await readFile(targetFile));
    const identity = computeArtifactIdentity(bytes);
    let artifactResult: PackageArtifactResponse | null = null;

    if (options.packageName?.trim()) {
      const packageName = normalizePackageNameOrFail(options.packageName);
      const registry = await getRegistry(opts, { cache: true });
      spinnerText(spinner, `Resolving ${packageName}`);
      const targetVersion = await resolvePackageVersion(registry, packageName, {
        version: options.version,
        tag: options.tag,
      });
      artifactResult = await apiRequestPackageArtifact(registry, packageName, targetVersion);
      validateDownloadedArtifact(packageName, artifactResult, bytes, identity);
    }

    const expectedSha256 =
      options.sha256?.trim() ||
      (artifactResult?.artifact.kind === "npm-pack" ? artifactResult.artifact.sha256 : undefined);
    const expectedNpmIntegrity =
      options.npmIntegrity?.trim() || artifactResult?.artifact.npmIntegrity;
    const expectedNpmShasum = options.npmShasum?.trim() || artifactResult?.artifact.npmShasum;
    assertDigestMatch("SHA-256", expectedSha256, identity.sha256);
    assertDigestMatch("npm integrity", expectedNpmIntegrity, identity.npmIntegrity);
    assertDigestMatch("npm shasum", expectedNpmShasum, identity.npmShasum);

    spinner?.stop();
    const output = {
      path: targetFile,
      bytes: bytes.byteLength,
      sha256: identity.sha256,
      npmIntegrity: identity.npmIntegrity,
      npmShasum: identity.npmShasum,
      expected: {
        sha256: expectedSha256,
        npmIntegrity: expectedNpmIntegrity,
        npmShasum: expectedNpmShasum,
        package: artifactResult?.package.name,
        version: artifactResult?.version,
        artifactKind: artifactResult?.artifact.kind,
      },
      verified: Boolean(expectedSha256 || expectedNpmIntegrity || expectedNpmShasum),
    };
    if (options.json) {
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
      return;
    }
    console.log(`Path: ${targetFile}`);
    console.log(`SHA-256: ${identity.sha256}`);
    console.log(`npm integrity: ${identity.npmIntegrity}`);
    console.log(`npm shasum: ${identity.npmShasum}`);
    if (output.verified) {
      console.log("OK. Artifact verification passed.");
    } else {
      console.log("Computed artifact digests. Pass --package or expected digests to verify.");
    }
  } catch (error) {
    spinner?.fail(formatError(error));
    throw error;
  }
}

export async function cmdPackageReadiness(
  opts: GlobalOpts,
  packageName: string,
  options: PackageReadinessOptions = {},
) {
  const trimmed = normalizePackageNameOrFail(packageName);
  const registry = await getRegistry(opts, { cache: true });
  const result = await apiRequest(
    registry,
    {
      method: "GET",
      path: `${ApiRoutes.packages}/${encodeURIComponent(trimmed)}/readiness`,
    },
    ApiV1PackageReadinessResponseSchema,
  );

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log(`${result.package.name} readiness: ${result.ready ? "ready" : "blocked"}`);
  for (const check of result.checks) {
    console.log(`${check.status.toUpperCase()} ${check.id}: ${check.message}`);
  }
  if (result.blockers.length > 0) {
    console.log(`Blockers: ${result.blockers.join(", ")}`);
  }
}

export async function cmdPackageMigrationStatus(
  opts: GlobalOpts,
  packageName: string,
  options: PackageMigrationStatusOptions = {},
) {
  const trimmed = normalizePackageNameOrFail(packageName);
  const registry = await getRegistry(opts, { cache: true });
  const result = await apiRequest(
    registry,
    {
      method: "GET",
      path: `${ApiRoutes.packages}/${encodeURIComponent(trimmed)}/readiness`,
    },
    ApiV1PackageReadinessResponseSchema,
  );

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const version = result.package.latestVersion ?? "no release";
  console.log(`${result.package.name} migration: ${result.ready ? "ready" : "blocked"}`);
  console.log(`Version: ${version}`);
  console.log(`Official: ${result.package.isOfficial ? "yes" : "no"}`);
  for (const check of result.checks) {
    console.log(`${check.status.toUpperCase()} ${check.id}: ${check.message}`);
  }
  if (result.blockers.length > 0) {
    console.log(`Blockers: ${result.blockers.join(", ")}`);
  }
}

async function apiRequestPackageDetail(registry: string, name: string) {
  return await apiRequest(
    registry,
    { method: "GET", path: `${ApiRoutes.packages}/${encodeURIComponent(name)}` },
    ApiV1PackageResponseSchema,
  );
}

async function apiRequestPackageArtifact(
  registry: string,
  name: string,
  version: string,
) {
  return await apiRequest(
    registry,
    {
      method: "GET",
      path: `${ApiRoutes.packages}/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}/artifact`,
    },
    ApiV1PackageArtifactResponseSchema,
  );
}

async function apiRequestPackageVersion(
  registry: string,
  name: string,
  version: string,
) {
  return await apiRequest(
    registry,
    {
      method: "GET",
      path: `${ApiRoutes.packages}/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`,
    },
    ApiV1PackageVersionResponseSchema,
  );
}

async function apiRequestPackageVersions(
  registry: string,
  name: string,
  limit: number,
) {
  const url = registryUrl(`${ApiRoutes.packages}/${encodeURIComponent(name)}/versions`, registry);
  url.searchParams.set("limit", String(limit));
  return await apiRequest(
    registry,
    { method: "GET", url: url.toString() },
    ApiV1PackageVersionListResponseSchema,
  );
}

async function resolvePackageVersion(
  registry: string,
  name: string,
  args: { version?: string; tag?: string },
) {
  if (args.version?.trim()) return args.version.trim();
  const detail = await apiRequestPackageDetail(registry, name);
  if (!detail.package) fail("Package not found");
  const tags = normalizeTags(detail.package.tags);
  if (args.tag?.trim()) {
    const tagged = tags[args.tag.trim()];
    if (!tagged) fail(`Unknown tag "${args.tag.trim()}"`);
    return tagged;
  }
  const latest = detail.package.latestVersion ?? tags.latest;
  if (!latest) fail("Could not resolve latest version");
  return latest;
}

function normalizePackageNameOrFail(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) fail("Package name required");
  return trimmed;
}

function spinnerText(spinner: ReturnType<typeof createSpinner> | null, text: string) {
  if (spinner) spinner.text = text;
}

function clampLimit(value: number, max: number) {
  if (!Number.isFinite(value)) return Math.min(25, max);
  return Math.max(1, Math.min(Math.round(value), max));
}

function formatPackageLine(item: {
  name: string;
  displayName: string;
  family: PackageFamily;
  latestVersion?: string | null;
  channel: "official" | "community" | "private";
  isOfficial: boolean;
  verificationTier?: string | null;
  summary?: string | null;
}) {
  const flags = [
    familyLabel(item.family),
    item.isOfficial ? "official" : item.channel,
    item.verificationTier ?? null,
  ].filter(Boolean);
  const version = item.latestVersion ? ` v${item.latestVersion}` : "";
  const summary = item.summary ? `  ${item.summary}` : "";
  return `${item.name}${version}  ${item.displayName}  [${flags.join(", ")}]${summary}`;
}

function computeArtifactIdentity(bytes: Uint8Array): ArtifactIdentity {
  return {
    sha256: digestHex(bytes, "sha256"),
    npmIntegrity: `sha512-${digestBase64(bytes, "sha512")}`,
    npmShasum: digestHex(bytes, "sha1"),
    byteLength: bytes.byteLength,
  };
}

function digestHex(bytes: Uint8Array, algorithm: "sha1" | "sha256") {
  return createHash(algorithm).update(bytes).digest("hex");
}

function digestBase64(bytes: Uint8Array, algorithm: "sha512") {
  return createHash(algorithm).update(bytes).digest("base64");
}

function validateDownloadedArtifact(
  requestedPackageName: string,
  artifactResult: PackageArtifactResponse,
  bytes: Uint8Array,
  identity: ArtifactIdentity,
) {
  const artifact = artifactResult.artifact;
  if (artifact.kind === "npm-pack") {
    assertDigestMatch("SHA-256", artifact.sha256, identity.sha256);
    if (typeof artifact.size === "number" && artifact.size !== identity.byteLength) {
      fail(`artifact size mismatch: expected ${artifact.size}, got ${identity.byteLength}`);
    }
    assertDigestMatch("npm integrity", artifact.npmIntegrity, identity.npmIntegrity);
    assertDigestMatch("npm shasum", artifact.npmShasum, identity.npmShasum);
    const parsed = parseClawPack(bytes);
    if (parsed.packageName !== artifactResult.package.name) {
      fail(
        `ClawPack package name mismatch: expected ${artifactResult.package.name}, got ${parsed.packageName}`,
      );
    }
    if (parsed.packageVersion !== artifactResult.version) {
      fail(
        `ClawPack package version mismatch: expected ${artifactResult.version}, got ${parsed.packageVersion}`,
      );
    }
    if (requestedPackageName !== artifactResult.package.name) {
      fail(
        `Resolved package mismatch: expected ${requestedPackageName}, got ${artifactResult.package.name}`,
      );
    }
  }
  if (requestedPackageName !== artifactResult.package.name) {
    fail(
      `Resolved package mismatch: expected ${requestedPackageName}, got ${artifactResult.package.name}`,
    );
  }
}

function assertDigestMatch(label: string, expected: string | null | undefined, actual: string) {
  if (!expected) return;
  if (expected !== actual) {
    fail(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

function defaultArtifactFilename(
  name: string,
  version: string,
  artifact: PackageArtifactResponse["artifact"],
) {
  if (artifact.kind === "npm-pack" && artifact.npmTarballName) return artifact.npmTarballName;
  const safeName = name
    .replace(/^@/, "")
    .replaceAll("/", "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${safeName}-${version}.${artifact.kind === "npm-pack" ? "tgz" : "zip"}`;
}

async function resolveArtifactOutputPath(
  opts: GlobalOpts,
  output: string | undefined,
  filename: string,
) {
  if (!output?.trim()) return resolve(opts.workdir, filename);
  const resolved = resolve(opts.workdir, output.trim());
  const outputStat = await stat(resolved).catch(() => null);
  if (outputStat?.isDirectory()) return join(resolved, filename);
  return resolved;
}

async function assertOutputWritable(path: string, force: boolean) {
  const existing = await stat(path).catch(() => null);
  if (existing && !force) fail(`Refusing to overwrite ${path}. Use --force.`);
  await mkdir(dirname(path), { recursive: true });
}

function printPackageSummary(detail: PackageResponse) {
  if (!detail.package) return;
  const pkg = detail.package;
  console.log(`${pkg.name}  ${pkg.displayName}`);
  console.log(`Family: ${familyLabel(pkg.family)}`);
  console.log(`Channel: ${pkg.channel}${pkg.isOfficial ? " (official)" : ""}`);
  if (pkg.summary) console.log(`Summary: ${pkg.summary}`);
  if (pkg.runtimeId) console.log(`Runtime ID: ${pkg.runtimeId}`);
  if (detail.owner?.handle || detail.owner?.displayName) {
    console.log(`Owner: ${detail.owner.handle ?? detail.owner.displayName}`);
  }
  console.log(`Created: ${formatTimestamp(pkg.createdAt)}`);
  console.log(`Updated: ${formatTimestamp(pkg.updatedAt)}`);
  if (pkg.latestVersion) console.log(`Latest: ${pkg.latestVersion}`);
  printArtifact(pkg.artifact ?? null);
  const tags = Object.entries(normalizeTags(pkg.tags));
  if (tags.length > 0) {
    console.log(`Tags: ${tags.map(([tag, version]) => `${tag}=${version}`).join(", ")}`);
  }
}

function printVersionSummary(version: NonNullable<PackageVersionResponse["version"]>) {
  console.log(`Selected: ${version.version}`);
  console.log(`Selected At: ${formatTimestamp(version.createdAt)}`);
  if (version.changelog.trim()) console.log(`Changelog: ${truncate(version.changelog, 120)}`);
}

function printCompatibility(compatibility: PackageCompatibility | null | undefined) {
  if (!compatibility) return;
  const entries = Object.entries(compatibility)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(",") : String(value)}`);
  if (entries.length > 0) console.log(`Compatibility: ${entries.join("; ")}`);
}

function printCapabilities(capabilities: PackageCapabilitySummary | null | undefined) {
  if (!capabilities) return;
  console.log(`Executes code: ${capabilities.executesCode ? "yes" : "no"}`);
  if (capabilities.pluginKind) console.log(`Plugin kind: ${capabilities.pluginKind}`);
  if (capabilities.bundleFormat) console.log(`Bundle format: ${capabilities.bundleFormat}`);
  if (capabilities.hostTargets?.length) {
    console.log(`Host targets: ${capabilities.hostTargets.join(", ")}`);
  }
  if (capabilities.channels?.length) console.log(`Channels: ${capabilities.channels.join(", ")}`);
  if (capabilities.providers?.length) {
    console.log(`Providers: ${capabilities.providers.join(", ")}`);
  }
  if (capabilities.toolNames?.length) console.log(`Tools: ${capabilities.toolNames.join(", ")}`);
  if (capabilities.commandNames?.length) {
    console.log(`Commands: ${capabilities.commandNames.join(", ")}`);
  }
  if (capabilities.serviceNames?.length) {
    console.log(`Services: ${capabilities.serviceNames.join(", ")}`);
  }
}

function printVerification(verification: PackageVerificationSummary | null | undefined) {
  if (!verification) return;
  console.log(`Verification: ${verification.tier} / ${verification.scope}`);
  if (verification.summary) console.log(`Verification Summary: ${verification.summary}`);
  if (verification.sourceRepo) console.log(`Source Repo: ${verification.sourceRepo}`);
  if (verification.sourceCommit) console.log(`Source Commit: ${verification.sourceCommit}`);
  if (verification.sourceTag) console.log(`Source Ref: ${verification.sourceTag}`);
  if (verification.scanStatus) console.log(`Scan: ${verification.scanStatus}`);
}

function printArtifact(artifact: PackageArtifactSummary | null | undefined) {
  if (!artifact || typeof artifact !== "object") return;
  const summary = artifact as {
    kind?: string;
    sha256?: string;
    size?: number;
    format?: string;
    npmIntegrity?: string;
    npmShasum?: string;
    npmTarballName?: string;
  };
  if (!summary.kind) return;
  console.log(`Artifact: ${summary.kind}${summary.format ? ` (${summary.format})` : ""}`);
  if (summary.sha256) console.log(`Artifact SHA-256: ${summary.sha256}`);
  if (typeof summary.size === "number") {
    console.log(`Artifact Size: ${formatByteCount(summary.size)}`);
  }
  if (summary.npmIntegrity) console.log(`npm integrity: ${summary.npmIntegrity}`);
  if (summary.npmShasum) console.log(`npm shasum: ${summary.npmShasum}`);
  if (summary.npmTarballName) console.log(`npm tarball: ${summary.npmTarballName}`);
}

function normalizeTags(tags: unknown): Record<string, string> {
  if (!tags || typeof tags !== "object") return {};
  const resolved: Record<string, string> = {};
  for (const [tag, version] of Object.entries(tags as Record<string, unknown>)) {
    if (typeof version === "string") resolved[tag] = version;
  }
  return resolved;
}

function normalizeFiles(files: unknown): PrintableFile[] {
  if (!Array.isArray(files)) return [];
  return files
    .map((file) => {
      if (!file || typeof file !== "object") return null;
      const entry = file as {
        path?: unknown;
        size?: unknown;
        sha256?: unknown;
        contentType?: unknown;
      };
      if (typeof entry.path !== "string") return null;
      return {
        path: entry.path,
        size: typeof entry.size === "number" ? entry.size : null,
        sha256: typeof entry.sha256 === "string" ? entry.sha256 : null,
        contentType: typeof entry.contentType === "string" ? entry.contentType : null,
      };
    })
    .filter((entry): entry is PrintableFile => Boolean(entry));
}

function formatFileLine(file: PrintableFile) {
  const size = typeof file.size === "number" ? `${file.size}B` : "?";
  const hash = file.sha256 ?? "?";
  return `- ${file.path}  ${size}  ${hash}`;
}

function familyLabel(family: PackageFamily) {
  switch (family) {
    case "code-plugin":
      return "Code Plugin";
    case "bundle-plugin":
      return "Bundle Plugin";
    default:
      return "Skill";
  }
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function formatTimestamp(value: number) {
  return new Date(value).toISOString();
}

async function readJsonFile(path: string) {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function packageJsonString(value: Record<string, unknown> | null, key: string): string | undefined {
  const candidate = value?.[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
}

function assertClawPackSize(size: number, label: string) {
  if (size > MAX_CLAWPACK_BYTES) {
    fail(`ClawPack "${label}" exceeds 120MB limit`);
  }
}

function formatByteCount(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
