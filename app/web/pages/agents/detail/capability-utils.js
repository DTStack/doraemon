'use strict';

function normalizeAgentCapabilities(capabilities) {
    if (!Array.isArray(capabilities)) return [];

    return capabilities
        .map((item) => {
            if (typeof item === 'string') {
                const name = item.trim();
                return name ? { id: '', name, description: '' } : null;
            }

            if (item && typeof item === 'object') {
                const name = String(item.name || item.description || '').trim();
                if (!name) return null;
                return {
                    id: String(item.id || '').trim(),
                    name,
                    description: String(item.description || '').trim(),
                };
            }

            return null;
        })
        .filter(Boolean);
}

module.exports = {
    normalizeAgentCapabilities,
};
