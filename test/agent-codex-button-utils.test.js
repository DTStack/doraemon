const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildAgentDetailCodexPrompt,
    buildCodexNewThreadUrl,
} = require('../app/web/pages/agents/codex-button-utils');

test('buildCodexNewThreadUrl builds a codex new thread deep link with encoded prompt and origin', () => {
    const url = buildCodexNewThreadUrl({
        prompt: '打开 Agent 市场\n使用示例',
        originUrl: 'http://10.10.10.168:7001/page/agents?keyword=AI Agent',
    });

    assert.equal(url.startsWith('codex://threads/new?'), true);
    assert.equal(url.includes('prompt='), true);
    assert.equal(url.includes('originUrl='), true);
    assert.equal(url.includes('AI+Agent'), true);
    assert.equal(url.includes('\n'), false);
});

test('buildAgentDetailCodexPrompt returns only the opening question prompt', () => {
    const prompt = buildAgentDetailCodexPrompt(
        {
            displayName: 'Bug 修复 Agent',
            name: 'bugfix-agent',
            description: '用于修复 Bug',
            entrypoint: { slug: 'bugfix-workflow', name: 'Bug 修复工作流' },
            dependencies: [
                { slug: 'zentao-api', name: '禅道 API' },
                { slug: 'gitlab-mr-ci-watch', name: 'MR CI 观察' },
            ],
            prompts: [{ title: '修复 Bug', prompt: '$bugfix-workflow 12345' }],
        },
        'http://10.10.10.168:7001/page/agents/bugfix-agent'
    );

    assert.equal(prompt, '$bugfix-workflow 12345');
});

test('buildAgentDetailCodexPrompt can use the selected opening question', () => {
    const prompt = buildAgentDetailCodexPrompt(
        {
            displayName: 'Bug 修复 Agent',
            name: 'bugfix-agent',
            prompts: [{ title: '默认问题', prompt: '$bugfix-workflow 默认' }],
        },
        'http://10.10.10.168:7001/page/agents/bugfix-agent',
        { title: '自然语言', prompt: '帮我修 bug，禅道 Bug ID 是 156343' }
    );

    assert.equal(prompt, '帮我修 bug，禅道 Bug ID 是 156343');
});
