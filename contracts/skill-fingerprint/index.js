'use strict';

const crypto = require('crypto');

const extensions = require('./extensions.json');

const TEXT_FILE_EXTENSIONS = Object.freeze([...extensions]);
const TEXT_FILE_EXTENSION_SET = new Set(TEXT_FILE_EXTENSIONS);

const FINGERPRINT_IGNORE_FILENAMES = Object.freeze([
    '.gitignore',
    '.dt-skillignore',
]);

const TEXT_SAMPLE_BYTES = 4096;

function normalizeFilePath(filePath) {
    return String(filePath || '')
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '');
}

function getFileExtension(filePath) {
    const normalized = normalizeFilePath(filePath);
    const fileName = normalized.split('/').pop() || '';
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
}

function hasDotPathSegment(filePath) {
    return normalizeFilePath(filePath)
        .split('/')
        .some((segment) => segment.startsWith('.'));
}

function isLikelyTextBytes(bytes) {
    const buffer = toBuffer(bytes);
    const sample = buffer.subarray(0, Math.min(buffer.length, TEXT_SAMPLE_BYTES));
    if (sample.includes(0)) return false;
    try {
        new TextDecoder('utf-8', { fatal: true }).decode(sample);
        return true;
    } catch {
        return false;
    }
}

function shouldIncludeFingerprintFile({ filePath, isBinary, bytes, ignoreMatcher } = {}) {
    const normalized = normalizeFilePath(filePath);
    if (!normalized || hasDotPathSegment(normalized)) {
        return false;
    }
    if (ignoreMatcher?.ignores(normalized)) {
        return false;
    }

    const extension = getFileExtension(normalized);
    if (extension) {
        return TEXT_FILE_EXTENSION_SET.has(extension);
    }

    if (typeof isBinary === 'boolean') {
        return !isBinary;
    }
    if (bytes !== undefined && bytes !== null) {
        return isLikelyTextBytes(bytes);
    }
    return false;
}

function toBuffer(bytes) {
    if (Buffer.isBuffer(bytes)) return bytes;
    return Buffer.from(bytes);
}

function sha256Hex(bytes) {
    return crypto.createHash('sha256').update(toBuffer(bytes)).digest('hex');
}

function buildSkillFingerprint(files) {
    const normalized = files
        .filter((file) => file && file.path && file.sha256)
        .map((file) => ({ path: normalizeFilePath(file.path), sha256: file.sha256 }))
        .sort((left, right) => left.path.localeCompare(right.path));
    const payload = normalized.map((file) => `${file.path}:${file.sha256}`).join('\n');
    return crypto.createHash('sha256').update(payload).digest('hex');
}

function buildSkillFingerprintFromStoredFiles(files, { ignoreMatcher } = {}) {
    const records = [];
    for (const file of files) {
        const filePath = file.file_path || file.path;
        const isBinary = file.is_binary === 1 || file.isBinary === true;
        if (
            !shouldIncludeFingerprintFile({
                filePath,
                isBinary,
                ignoreMatcher,
            })
        ) {
            continue;
        }
        const content = file.content || '';
        const buffer = isBinary ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf8');
        records.push({
            path: normalizeFilePath(filePath),
            sha256: sha256Hex(buffer),
        });
    }
    return buildSkillFingerprint(records);
}

function fingerprintFromGoldenCase(testCase) {
    const ignore = require('ignore')();
    for (const ignoreFile of testCase.ignoreFiles || []) {
        ignore.add(String(ignoreFile.content).split(/\r?\n/));
    }
    const storedFiles = [
        ...(testCase.ignoreFiles || []).map((file) => ({
            file_path: file.path,
            content: file.content,
            is_binary: 0,
        })),
        ...(testCase.files || []).map((file) => ({
            file_path: file.path,
            content: file.content,
            is_binary: file.isBinary ? 1 : 0,
            encoding: file.encoding,
        })),
    ];
    return buildSkillFingerprintFromStoredFiles(storedFiles, { ignoreMatcher: ignore });
}

module.exports = {
    TEXT_FILE_EXTENSIONS,
    TEXT_FILE_EXTENSION_SET,
    FINGERPRINT_IGNORE_FILENAMES,
    TEXT_SAMPLE_BYTES,
    normalizeFilePath,
    getFileExtension,
    hasDotPathSegment,
    isLikelyTextBytes,
    shouldIncludeFingerprintFile,
    sha256Hex,
    buildSkillFingerprint,
    buildSkillFingerprintFromStoredFiles,
    fingerprintFromGoldenCase,
};
