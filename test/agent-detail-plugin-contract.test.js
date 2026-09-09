const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

test('Agent 详情页只展示 plugin manifest 字段', () => {
    const component = fs.readFileSync(
        path.join(ROOT, 'app/web/pages/agents/detail/AgentDetailContent.tsx'),
        'utf8'
    );
    const types = fs.readFileSync(path.join(ROOT, 'app/web/pages/agents/types.ts'), 'utf8');
    const api = fs.readFileSync(path.join(ROOT, 'app/web/api/url.ts'), 'utf8');

    assert.match(component, /detail\??\.longDescription/);
    assert.match(component, /detail\??\.defaultPrompt/);
    assert.match(component, /agent-detail-content/);
    assert.doesNotMatch(component, /<Tabs|<TabPane|agent-detail-tabs/);
    assert.doesNotMatch(component, /开场消息/);
    assert.doesNotMatch(component, /核心工作流/);
    assert.doesNotMatch(component, /Agent 能力/);
    assert.doesNotMatch(component, /AgentSkillRelation/);
    assert.doesNotMatch(
        types,
        /AgentSkillRelation|entrypoint|dependencies|privateSkills|demoImages/
    );
    // 相关 Agent 模块已恢复（独立接口，不注入 plugin 数据模型）
    assert.match(component, /getRelatedAgents/);
    assert.match(api, /getRelatedAgents|\/api\/agents\/related/);
    assert.doesNotMatch(api, /\/api\/agents\/entrypoint/);
});
