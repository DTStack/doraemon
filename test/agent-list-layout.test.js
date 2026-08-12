const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Agent 列表卡片不再把 category 渲染成 tag，并提供删除按钮本地开关注释', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/index.tsx'),
        'utf8'
    );

    assert.equal(
        content.includes('<Tag>{agent.category}</Tag>'),
        false,
        '列表卡片不应再把 category 渲染成 tag'
    );
    assert.equal(
        content.includes('doraemon.agentMarket.deleteEnabled'),
        true,
        '应包含删除按钮 localStorage 开关键'
    );
    assert.equal(
        content.includes("localStorage.setItem('doraemon.agentMarket.deleteEnabled', 'true')"),
        true,
        '应在删除按钮旁保留启用写法注释'
    );
    assert.equal(
        content.includes('agent.tags.slice(0, 4)'),
        true,
        '列表页 tag 数量应与详情页保持一致'
    );
});

test('Agent 列表卡片描述字号为 13px', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/style.scss'),
        'utf8'
    );

    assert.equal(
        content.includes('.agent-card-description') && content.includes('font-size: 13px;'),
        true,
        '列表页描述字号需要是 13px'
    );
});

test('Agent 列表页提供帮助文档入口并读取独立配置', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/index.tsx'),
        'utf8'
    );

    assert.equal(content.includes("import helpIcon from '@/asset/images/help-icon.png';"), true);
    assert.equal(content.includes('config.agentHelpDocUrl'), true, '应读取 Agent 独立帮助文档配置');
    assert.equal(content.includes('title="Agent 市场帮助文档"'), true, '应提供帮助文档提示文案');
});
