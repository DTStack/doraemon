const test = require('node:test');
const assert = require('node:assert/strict');

const { SKILL_CATEGORY_OPTIONS, isValidSkillCategory } = require('../contracts/skill-categories');

test('skill-categories contract lists the market enum', () => {
    assert.ok(Array.isArray(SKILL_CATEGORY_OPTIONS));
    assert.ok(SKILL_CATEGORY_OPTIONS.includes('通用'));
    assert.ok(SKILL_CATEGORY_OPTIONS.includes('工程效率'));
    assert.equal(SKILL_CATEGORY_OPTIONS.length, 8);
});

test('isValidSkillCategory rejects unknown values', () => {
    assert.equal(isValidSkillCategory('前端'), true);
    assert.equal(isValidSkillCategory('not-a-real-category'), false);
    assert.equal(isValidSkillCategory(''), false);
    assert.equal(isValidSkillCategory(null), false);
});
