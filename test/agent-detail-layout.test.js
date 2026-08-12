const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Agent 简介页不再重复渲染 category 标签，并包含消息/问题图标结构', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/AgentDetailContent.tsx'),
        'utf8'
    );

    assert.equal(
        content.includes('<Tag>{detail.category}</Tag>'),
        false,
        '不应重复渲染 category 标签'
    );
    assert.equal(
        content.includes('agent-intro-icon-wrap is-message'),
        true,
        '开场消息区域需要消息图标'
    );
    assert.equal(content.includes('agent-intro-count'), true, '开场问题数量需要和标题同行展示');
    assert.equal(
        content.includes('{introBlocks.openingQuestions.length} 个'),
        true,
        '开场问题数量需要显示为 N 个'
    );
});

test('概览页不再重复渲染示例问题区块', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/AgentDetailContent.tsx'),
        'utf8'
    );

    assert.equal(
        content.includes('Title level={4}>示例问题</Title>'),
        false,
        '概览页不应继续渲染示例问题区块'
    );
});

test('概览描述和 Agent 简介正文字号为 16px', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/style.scss'),
        'utf8'
    );

    assert.equal(
        content.includes('.agent-overview-description') && content.includes('font-size: 16px;'),
        true,
        '概览描述字号需要是 16px'
    );
    assert.equal(
        content.includes('.agent-profile-copy') && content.includes('font-size: 16px;'),
        true,
        'Agent 简介正文字号需要是 16px'
    );
});

test('概览描述复用 Agent 简介正文容器样式', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/AgentDetailContent.tsx'),
        'utf8'
    );

    assert.equal(
        content.includes(
            '<div className="agent-intro-panel agent-profile-copy agent-overview-description">'
        ),
        true,
        '概览描述需要使用与 Agent 简介相同的正文容器'
    );
});

test('Agent 详情页自身负责滚动，避免高内容区被父层裁剪', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/style.scss'),
        'utf8'
    );

    assert.equal(content.includes('overflow: auto;'), true, 'Agent 详情页需要显式开启滚动');
    assert.equal(
        content.includes('max-width: 1300px;') && content.includes('margin: 0 auto;'),
        true,
        'Agent 详情内容需要限制为 1300px 并居中展示'
    );
});

test('Agent 演示使用缩略图切换当前图片并限制完整图宽度', () => {
    const componentContent = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/AgentDetailContent.tsx'),
        'utf8'
    );
    const styleContent = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/style.scss'),
        'utf8'
    );

    assert.equal(
        componentContent.includes('agent-demo-thumbnails') &&
            componentContent.includes('setSelectedDemoIndex(index)') &&
            componentContent.includes('agent-demo-preview'),
        true,
        'Agent 演示需要提供缩略图切换和当前图片预览'
    );
    assert.equal(
        componentContent.includes('description="暂无演示图片"'),
        true,
        'Agent 演示无图片时需要展示空态'
    );
    assert.equal(
        styleContent.includes('width: min(80%, 960px);'),
        true,
        '当前演示图片需要限制展示宽度'
    );
});

test('Agent 简介页三块内容间距为 16px，消息和问题卡片使用双列布局', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/style.scss'),
        'utf8'
    );

    assert.equal(
        content.includes('.agent-intro-sections') && content.includes('gap: 16px;'),
        true,
        '三块内容区域之间需要是 16px 间距'
    );
    assert.equal(
        content.includes('grid-template-columns: 32px minmax(0, 1fr);'),
        true,
        '图标和文案需要用双列布局保持在一行'
    );
});

test('概览页的 Agent 能力使用紧凑网格卡片，不再渲染纵向列表', () => {
    const componentContent = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/AgentDetailContent.tsx'),
        'utf8'
    );
    const styleContent = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/style.scss'),
        'utf8'
    );

    assert.equal(
        componentContent.includes('agent-capability-grid'),
        true,
        'Agent 能力区块需要使用紧凑网格'
    );
    assert.equal(componentContent.includes('<List'), false, 'Agent 能力区块不应继续使用纵向 List');
    assert.equal(
        styleContent.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'),
        true,
        '桌面端 Agent 能力需要使用三列网格'
    );
    assert.equal(
        styleContent.includes('padding: 10px 12px;') &&
            styleContent.includes('border-radius: 10px;'),
        true,
        'Agent 能力卡片需要使用紧凑内边距和圆角'
    );
});

test('Agent 能力页签中的内置 Skills 使用紧凑双列网格', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/style.scss'),
        'utf8'
    );

    assert.equal(
        content.includes('.agent-skill-grid') &&
            content.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'),
        true,
        '内置 Skills 需要使用双列紧凑网格'
    );
    assert.equal(
        content.includes('.agent-skill-card') && content.includes('padding: 14px 16px;'),
        true,
        '内置 Skills 卡片需要收紧内边距'
    );
    assert.equal(
        content.includes('.agent-skill-card-title') &&
            content.includes('span:first-child') &&
            content.includes('font-size: 15px;'),
        true,
        '内置 Skills 标题字号需要提升'
    );
    assert.equal(
        content.includes('.agent-skill-card-description') && content.includes('font-size: 15px;'),
        true,
        '内置 Skills 描述字号需要提升'
    );
});

test('相关 Agent 为空时展示暂无数据空态', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/AgentDetailContent.tsx'),
        'utf8'
    );

    assert.equal(
        content.includes('related.length > 0') && content.includes('description="暂无相关 Agent"'),
        true,
        '相关 Agent 为空时需要展示明确的空态'
    );
});

test('Agent 详情右侧展示可复制的自动安装命令', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/AgentDetailContent.tsx'),
        'utf8'
    );
    const styleContent = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/style.scss'),
        'utf8'
    );

    assert.equal(
        content.includes('curl -fsSL ${currentOrigin}/agent-market/install.sh') &&
            content.includes('| bash -s -- ${detail.name}'),
        true,
        '安装命令需要根据当前站点地址和 Agent 名称动态拼接'
    );
    assert.equal(
        content.includes('agent-install-terminal') &&
            content.includes('copyToClipboard(') &&
            content.includes('installCommand,') &&
            content.includes("'Agent 安装命令已复制到剪贴板'"),
        true,
        '右侧安装面板需要展示终端命令并支持复制'
    );
    assert.equal(content.includes("message.info('敬请期待')"), false, '不应继续展示安装占位按钮');
    assert.equal(
        styleContent.includes('.ant-btn.agent-install-copy') &&
            styleContent.includes('border-color: transparent;') &&
            styleContent.includes('background: transparent;') &&
            styleContent.includes('box-shadow: none;'),
        true,
        '终端复制按钮需要清除 Ant Design 的默认白底、边框和阴影'
    );
});

test('Agent 开场问题卡片提供调起 Codex 的快捷使用入口', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/AgentDetailContent.tsx'),
        'utf8'
    );
    const styleContent = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/style.scss'),
        'utf8'
    );

    assert.equal(
        content.includes('buildAgentDetailCodexPrompt') &&
            content.includes('buildCodexNewThreadUrl') &&
            content.includes('className="agent-question-quick-use"') &&
            content.includes('agent-question-quick-use-icon') &&
            content.includes('onClick') &&
            content.includes('openCodexInstall(item)') &&
            content.includes('快捷使用'),
        true,
        '开场问题卡片需要提供快捷使用按钮并调起 Codex'
    );
    assert.equal(
        content.includes('className="agent-quick-use"'),
        false,
        '右侧不应再展示独立快捷使用按钮'
    );
    assert.equal(
        styleContent.includes('.agent-question-quick-use') &&
            styleContent.includes('grid-template-columns: 32px minmax(0, 1fr);') &&
            styleContent.includes('align-items: center;') &&
            styleContent.includes('&:hover,') &&
            styleContent.includes('transform: translateY(-1px);') &&
            styleContent.includes('border-color: #D8DFEA;') &&
            styleContent.includes('.agent-question-quick-use-icon') &&
            !styleContent.includes('border: 1px solid #F59E0B;'),
        true,
        '开场问题快捷使用按钮需要左右布局、垂直居中并提供克制的 hover 样式'
    );
});

test('Agent 详情右侧提供当前原始 ZIP 下载入口', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/AgentDetailContent.tsx'),
        'utf8'
    );

    assert.equal(
        content.includes('/api/agents/download?name=${encodeURIComponent(detail.name)}') &&
            content.includes('下载 Agent ZIP'),
        true,
        '详情页需要提供当前 Agent 原始 ZIP 下载按钮'
    );
});
