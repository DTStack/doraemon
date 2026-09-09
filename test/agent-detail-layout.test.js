const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const COMPONENT_PATH = path.join(
    __dirname,
    '../app/web/pages/agents/detail/AgentDetailContent.tsx'
);
const STYLE_PATH = path.join(__dirname, '../app/web/pages/agents/detail/style.scss');

function readDetailFiles() {
    return {
        component: fs.readFileSync(COMPONENT_PATH, 'utf8'),
        style: fs.readFileSync(STYLE_PATH, 'utf8'),
    };
}

test('Agent 详情页使用 plugin 的长描述和默认 prompt', () => {
    const { component } = readDetailFiles();

    assert.match(component, /detail\?\.longDescription/);
    assert.match(component, /detail\?\.defaultPrompt/);
    assert.match(component, /openingQuestions/);
    assert.doesNotMatch(component, /开场消息|openingMessage/);
});

test('Agent 详情页已移除 demo 关系字段，并恢复相关 Agent 模块', () => {
    const { component, style } = readDetailFiles();

    assert.doesNotMatch(component, /Agent 能力|核心工作流|agent-demo|AgentSkillRelation/);
    assert.doesNotMatch(component, /agent-demo|agent-message/);
    assert.doesNotMatch(style, /agent-demo|agent-message/);
    // 相关 Agent 模块已恢复（侧栏）
    assert.match(component, /相关 Agent/);
    assert.match(component, /getRelatedAgents/);
    assert.match(component, /related-agent-card/);
    assert.match(style, /\.agent-side-related/);
});

test('概览页保留短描述和顶部功能标签', () => {
    const { component } = readDetailFiles();

    assert.match(component, /detail\.description/);
    assert.match(component, /agent-hero-capabilities/);
    assert.doesNotMatch(component, /agent-capability-grid|<List/);
});

test('详情页自身负责滚动并限制内容宽度', () => {
    const { style } = readDetailFiles();

    assert.match(style, /overflow: auto;/);
    assert.match(style, /max-width: 1300px;/);
    assert.match(style, /margin: 0 auto;/);
});

test('Agent 详情页右侧提供可复制的自动安装命令', () => {
    const { component, style } = readDetailFiles();

    assert.match(component, /curl -fsSL \$\{currentOrigin\}\/agent-market\/install\.sh/);
    assert.match(component, /\| bash -s -- \$\{detail\.name\}/);
    assert.match(component, /copyToClipboard\(/);
    assert.match(component, /Agent 安装命令已复制到剪贴板/);
    assert.doesNotMatch(component, /敬请期待/);
    assert.match(style, /\.ant-btn\.agent-install-copy/);
});

test('Agent 开场问题卡片提供调起 Codex 的快捷使用入口', () => {
    const { component, style } = readDetailFiles();

    assert.match(component, /buildAgentDetailCodexPrompt/);
    assert.match(component, /buildCodexNewThreadUrl/);
    assert.match(component, /className="agent-question-quick-use"/);
    assert.match(component, /openCodexInstall\(item\)/);
    assert.match(component, /快捷使用/);
    assert.match(style, /\.agent-question-quick-use/);
});

test('Agent 详情页提供当前原始 ZIP 下载入口', () => {
    const { component } = readDetailFiles();

    assert.match(
        component,
        /\/api\/agents\/download\?name=\$\{encodeURIComponent\(detail\.name\)\}/
    );
    assert.match(component, /下载 Agent ZIP/);
});
