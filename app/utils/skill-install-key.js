function sanitizeInstallKeySegment(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}

function createInstallKeyCandidates(skill = {}) {
    const candidates = [];
    const pushCandidate = (value) => {
        const normalized = sanitizeInstallKeySegment(value);
        if (normalized && !candidates.includes(normalized)) {
            candidates.push(normalized);
        }
    };

    pushCandidate(skill.name);

    const sourcePath = String(skill.sourcePath || '')
        .trim()
        .replace(/\\/g, '/');
    if (sourcePath) {
        const segments = sourcePath.split('/').filter(Boolean);
        if (segments.length > 0) {
            pushCandidate(segments[segments.length - 1]);
        }
    }

    pushCandidate(skill.slug);
    pushCandidate('skill');
    return candidates;
}

function createInstallKeyMap(skills = []) {
    const bySlug = new Map();
    const byInstallKey = new Map();
    const counts = new Map();
    const list = skills.map((skill) => {
        const candidates = createInstallKeyCandidates(skill);
        let installKey = candidates.find((candidate) => !byInstallKey.has(candidate)) || '';

        if (!installKey) {
            const baseKey = candidates[0] || 'skill';
            const nextCount = (counts.get(baseKey) || 1) + 1;
            counts.set(baseKey, nextCount);
            installKey = `${baseKey}-${nextCount}`;
            while (byInstallKey.has(installKey)) {
                const currentCount = (counts.get(baseKey) || nextCount) + 1;
                counts.set(baseKey, currentCount);
                installKey = `${baseKey}-${currentCount}`;
            }
        } else {
            const baseKey = candidates[0] || installKey;
            counts.set(baseKey, Math.max(counts.get(baseKey) || 1, 1));
        }

        const normalizedSkill = {
            ...skill,
            installKey,
        };
        bySlug.set(normalizedSkill.slug, normalizedSkill);
        byInstallKey.set(installKey, normalizedSkill);
        return normalizedSkill;
    });

    return {
        list,
        bySlug,
        byInstallKey,
    };
}

function resolveSkillIdentifier(identifier, indexes = {}) {
    const value = String(identifier || '').trim();
    if (!value) return null;
    if (indexes.bySlug instanceof Map && indexes.bySlug.has(value)) {
        return indexes.bySlug.get(value);
    }
    if (indexes.byInstallKey instanceof Map && indexes.byInstallKey.has(value)) {
        return indexes.byInstallKey.get(value);
    }
    return null;
}

function createUniqueSkillNames(skillNames = []) {
    const values = [];
    const seen = new Set();

    skillNames.forEach((item) => {
        const name = String(item || '').trim();
        if (!name) return;
        if (seen.has(name)) return;
        seen.add(name);
        values.push(name);
    });

    return values;
}

module.exports = {
    sanitizeInstallKeySegment,
    createInstallKeyCandidates,
    createInstallKeyMap,
    resolveSkillIdentifier,
    createUniqueSkillNames,
};
