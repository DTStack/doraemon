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

function unquoteYamlScalar(raw) {
    const value = String(raw || '').trim();
    if (
        (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
        (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
        return value.slice(1, -1);
    }
    return value;
}

/** First non-empty body line that is not a markdown heading. */
function extractBodySummary(content) {
    const stripped = String(content || '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && !line.startsWith('---'));
    return stripped[0] || '';
}

/**
 * Card summary from SKILL.md: frontmatter `description:` then first body line.
 * Shared by registry publish and Web zip import.
 */
function extractSkillMdDescription(skillMdContent) {
    const text = String(skillMdContent || '');
    const normalized = text.replace(/\r\n/g, '\n');
    let body = normalized;
    let frontmatterDescription = '';

    if (normalized.startsWith('---\n')) {
        const endMarkerIndex = normalized.indexOf('\n---\n', 4);
        if (endMarkerIndex !== -1) {
            const frontmatterText = normalized.slice(4, endMarkerIndex);
            body = normalized.slice(endMarkerIndex + 5);
            const lines = frontmatterText.split('\n');
            for (let i = 0; i < lines.length; i += 1) {
                const keyMatch = lines[i].match(/^description:\s*(.*)$/i);
                if (!keyMatch) continue;
                const rest = keyMatch[1].trim();
                // Block scalar: description: | / > then indented lines
                if (rest === '|' || rest === '>' || rest === '|-' || rest === '>-') {
                    const collected = [];
                    for (let j = i + 1; j < lines.length; j += 1) {
                        const cont = lines[j];
                        if (/^\S/.test(cont) && cont.includes(':')) break;
                        if (/^\s+\S/.test(cont) || cont.trim() === '') {
                            collected.push(cont.replace(/^\s+/, ''));
                        } else {
                            break;
                        }
                    }
                    frontmatterDescription = collected.join(' ').replace(/\s+/g, ' ').trim();
                } else if (rest) {
                    frontmatterDescription = unquoteYamlScalar(rest);
                } else {
                    // description:\n  indented multi-line without |/>
                    const collected = [];
                    for (let j = i + 1; j < lines.length; j += 1) {
                        const cont = lines[j];
                        if (/^\S/.test(cont)) break;
                        if (cont.trim()) collected.push(cont.trim());
                    }
                    frontmatterDescription = collected.join(' ').replace(/\s+/g, ' ').trim();
                }
                break;
            }
        }
    }

    const fromFm = String(frontmatterDescription || '').trim();
    if (fromFm) return fromFm;
    return extractBodySummary(body) || extractBodySummary(normalized);
}

/** Frontmatter `name:` from SKILL.md, quoted-scalar aware. Empty when absent. */
function extractSkillMdName(content) {
    const text = String(content || '');
    const normalized = text.replace(/\r\n/g, '\n');
    if (!normalized.startsWith('---\n')) return '';
    const endMarkerIndex = normalized.indexOf('\n---\n', 4);
    if (endMarkerIndex === -1) return '';
    const frontmatterText = normalized.slice(4, endMarkerIndex);
    const lines = frontmatterText.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
        const keyMatch = lines[i].match(/^name:\s*(.*)$/i);
        if (!keyMatch) continue;
        const rest = keyMatch[1].trim();
        if (!rest) continue;
        if (
            (rest.startsWith('"') && rest.endsWith('"')) ||
            (rest.startsWith("'") && rest.endsWith("'"))
        ) {
            return rest.slice(1, -1).trim();
        }
        return rest;
    }
    return '';
}

/**
 * Market card description (CLI registry + Web zip/import/update).
 * Explicit override wins; else keep non-empty card; else SKILL.md default.
 *
 * @param {{ hasDescription?: boolean, description?: string, currentDescription?: string, fromSkillMd?: string }} opts
 * @returns {string}
 */
function resolveMarketCardDescription(opts = {}) {
    if (opts.hasDescription) {
        return String(opts.description || '').trim();
    }
    const current = String(opts.currentDescription || '').trim();
    if (current) return current;
    return String(opts.fromSkillMd || '').trim();
}

module.exports = {
    normalizeRelativePath,
    extractSkillMdDescription,
    extractSkillMdName,
    extractBodySummary,
    resolveMarketCardDescription,
};
