const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeAgentCapabilities } = require('../app/web/pages/agents/detail/capability-utils');

test('normalizeAgentCapabilities 兼容旧的字符串数组能力数据', () => {
    const result = normalizeAgentCapabilities(['分析 Bug', '修复代码']);

    assert.deepEqual(result, [
        { id: '', name: '分析 Bug', description: '' },
        { id: '', name: '修复代码', description: '' },
    ]);
});

test('normalizeAgentCapabilities 保留对象型能力数据的 name 和 description', () => {
    const result = normalizeAgentCapabilities([
        { id: 'bug-context', name: 'Bug 信息分析', description: '获取上下文' },
    ]);

    assert.deepEqual(result, [
        { id: 'bug-context', name: 'Bug 信息分析', description: '获取上下文' },
    ]);
});
