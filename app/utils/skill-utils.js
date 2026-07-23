const path = require('path');

// ponytail: shared path guard for skill file paths; returns null on invalid
// so callers choose how to surface the error (ctx.throw / skip / etc).
// Used by skills.js and skillsRegistry.js to keep traversal defense in one place.
function normalizeRelativePath(filePath) {
    const value = String(filePath || '').trim();
    if (!value) return null;

    const normalized = path.normalize(value).replace(/\\/g, '/').replace(/^\/+/, '');

    if (!normalized || normalized === '.' || normalized.startsWith('..')) {
        return null;
    }

    return normalized;
}

module.exports = { normalizeRelativePath };
