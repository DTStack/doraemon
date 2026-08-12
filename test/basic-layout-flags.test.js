const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldUseSkillDetailLayout } = require('../app/web/layouts/basicLayout/layout-flags');

test('skills 详情页命中专用布局', () => {
    assert.equal(shouldUseSkillDetailLayout('/page/skills/bugfix-workflow'), true);
});

test('agents 详情页不命中 skills 专用布局，避免页面滚动被锁住', () => {
    assert.equal(shouldUseSkillDetailLayout('/page/agents/bugfix-agent'), false);
});
