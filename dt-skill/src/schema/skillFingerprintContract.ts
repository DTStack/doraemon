import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const currentDir = dirname(fileURLToPath(import.meta.url));
const contractPath = currentDir.endsWith(`${sep}src${sep}schema`)
  ? resolve(currentDir, "../../dist/contracts/skill-fingerprint/index.cjs")
  : resolve(currentDir, "../contracts/skill-fingerprint/index.cjs");

const contract = require(contractPath);

export const TEXT_FILE_EXTENSIONS = contract.TEXT_FILE_EXTENSIONS as readonly string[];
export const TEXT_FILE_EXTENSION_SET = contract.TEXT_FILE_EXTENSION_SET as ReadonlySet<string>;
export const FINGERPRINT_IGNORE_FILENAMES =
  contract.FINGERPRINT_IGNORE_FILENAMES as readonly string[];
export const TEXT_SAMPLE_BYTES = contract.TEXT_SAMPLE_BYTES as number;

export const normalizeFilePath = contract.normalizeFilePath as (filePath: string) => string;
export const getFileExtension = contract.getFileExtension as (filePath: string) => string;
export const hasDotPathSegment = contract.hasDotPathSegment as (filePath: string) => boolean;
export const isLikelyTextBytes = contract.isLikelyTextBytes as (
  bytes: Uint8Array | Buffer,
) => boolean;
export const shouldIncludeFingerprintFile = contract.shouldIncludeFingerprintFile as (options: {
  filePath: string;
  isBinary?: boolean;
  bytes?: Uint8Array | Buffer;
  ignoreMatcher?: { ignores(path: string): boolean } | null;
}) => boolean;
export const sha256Hex = contract.sha256Hex as (bytes: Uint8Array | Buffer) => string;
export const buildSkillFingerprint = contract.buildSkillFingerprint as (
  files: Array<{ path: string; sha256: string }>,
) => string;
export const buildSkillFingerprintFromStoredFiles =
  contract.buildSkillFingerprintFromStoredFiles as (
    files: Array<{
      file_path?: string;
      path?: string;
      content?: string;
      is_binary?: number;
      isBinary?: boolean;
      encoding?: string;
    }>,
    options?: { ignoreMatcher?: { ignores(path: string): boolean } | null },
  ) => string;
export const fingerprintFromGoldenCase = contract.fingerprintFromGoldenCase as (
  testCase: {
    ignoreFiles?: Array<{ path: string; content: string }>;
    files: Array<{
      path: string;
      content: string;
      encoding?: string;
      isBinary?: boolean;
    }>;
  },
) => string;
