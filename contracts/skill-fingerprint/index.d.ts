export const TEXT_FILE_EXTENSIONS: readonly string[];
export const TEXT_FILE_EXTENSION_SET: ReadonlySet<string>;
export const FINGERPRINT_IGNORE_FILENAMES: readonly string[];
export const TEXT_SAMPLE_BYTES: number;

export function normalizeFilePath(filePath: string): string;
export function getFileExtension(filePath: string): string;
export function hasDotPathSegment(filePath: string): boolean;
export function isLikelyTextBytes(bytes: Uint8Array | Buffer): boolean;

export type FingerprintIgnoreMatcher = {
    ignores(path: string): boolean;
};

export function shouldIncludeFingerprintFile(options: {
    filePath: string;
    isBinary?: boolean;
    bytes?: Uint8Array | Buffer;
    ignoreMatcher?: FingerprintIgnoreMatcher | null;
}): boolean;

export function sha256Hex(bytes: Uint8Array | Buffer): string;

export function buildSkillFingerprint(
    files: Array<{ path: string; sha256: string }>
): string;

export function buildSkillFingerprintFromStoredFiles(
    files: Array<{
        file_path?: string;
        path?: string;
        content?: string;
        is_binary?: number;
        isBinary?: boolean;
        encoding?: string;
    }>,
    options?: { ignoreMatcher?: FingerprintIgnoreMatcher | null }
): string;

export type GoldenVectorCase = {
    name: string;
    fingerprint?: string;
    ignoreFiles?: Array<{ path: string; content: string }>;
    files: Array<{
        path: string;
        content: string;
        encoding?: string;
        isBinary?: boolean;
    }>;
};

export function fingerprintFromGoldenCase(testCase: GoldenVectorCase): string;
