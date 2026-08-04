/**
 * Coerce a DB/API count field to a non-negative integer.
 * Prefer over `Number(x) || 0` so explicit 0 is not special-cased via truthiness.
 */
function coerceCount(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.floor(n);
}

function sumCounts(items, getCount) {
    let sum = 0;
    for (const item of items || []) {
        sum += coerceCount(getCount(item));
    }
    return sum;
}

/**
 * Sum numeric fields of child rows grouped by parent key (package totals).
 * @param {Array<object>} items
 * @param {{ parentKey: string, fields: string[] }} opts
 * @returns {Record<string, Map<string, number>>}
 */
function aggregateCountsByParent(items, { parentKey, fields }) {
    const maps = {};
    for (const field of fields) {
        maps[field] = new Map();
    }
    for (const item of items || []) {
        const parent = item[parentKey];
        if (parent == null || parent === '') continue;
        for (const field of fields) {
            const current = maps[field].get(parent) || 0;
            maps[field].set(parent, current + coerceCount(item[field]));
        }
    }
    return maps;
}

function isDuplicateIndexError(error) {
    const code = error?.original?.code || error?.parent?.code || error?.code;
    if (code === 'ER_DUP_KEYNAME') return true;
    const errno = error?.original?.errno ?? error?.parent?.errno ?? error?.errno;
    // MySQL ER_DUP_KEYNAME
    return errno === 1061;
}

module.exports = {
    coerceCount,
    sumCounts,
    aggregateCountsByParent,
    isDuplicateIndexError,
};
