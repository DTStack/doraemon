import {
  TEXT_FILE_EXTENSIONS,
  TEXT_FILE_EXTENSION_SET,
} from "./skillFingerprintContract.js";

const RAW_TEXT_CONTENT_TYPES = [
  "application/json",
  "application/xml",
  "application/yaml",
  "application/x-yaml",
  "application/toml",
  "application/javascript",
  "application/typescript",
  "application/markdown",
  "image/svg+xml",
] as const;

export { TEXT_FILE_EXTENSIONS, TEXT_FILE_EXTENSION_SET };

export const TEXT_CONTENT_TYPES = RAW_TEXT_CONTENT_TYPES;
export const TEXT_CONTENT_TYPE_SET = new Set<string>(TEXT_CONTENT_TYPES);

export function isTextContentType(contentType: string) {
  if (!contentType) return false;
  const normalized = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  if (normalized.startsWith("text/")) return true;
  return TEXT_CONTENT_TYPE_SET.has(normalized);
}
