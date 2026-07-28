'use strict';

const categories = require('./categories.json');

const SKILL_CATEGORY_OPTIONS = Object.freeze([...categories]);
const SKILL_CATEGORY_SET = new Set(SKILL_CATEGORY_OPTIONS);

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isValidSkillCategory(value) {
    return typeof value === 'string' && SKILL_CATEGORY_SET.has(value);
}

module.exports = {
    SKILL_CATEGORY_OPTIONS,
    SKILL_CATEGORY_SET,
    isValidSkillCategory,
};
