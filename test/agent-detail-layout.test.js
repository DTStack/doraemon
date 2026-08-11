const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Agent 简介页不再重复渲染 category 标签，并包含消息/问题图标结构', () => {
    const content = fs.readFileSync(
        path.join(
            __dirname,
            '../app/web/pages/agents/detail/AgentDetailContent.tsx'
        ),
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
    assert.equal(
        content.includes('agent-intro-count'),
        true,
        '开场问题数量需要和标题同行展示'
    );
    assert.equal(
        content.includes('{introBlocks.openingQuestions.length} 个'),
        true,
        '开场问题数量需要显示为 N 个'
    );
});

test('概览页不再重复渲染示例问题区块', () => {
    const content = fs.readFileSync(
        path.join(
            __dirname,
            '../app/web/pages/agents/detail/AgentDetailContent.tsx'
        ),
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

test('Agent 详情页自身负责滚动，避免高内容区被父层裁剪', () => {
    const content = fs.readFileSync(
        path.join(
            __dirname,
            '../app/web/pages/agents/detail/style.scss'
        ),
        'utf8'
    );

    assert.equal(
        content.includes('overflow: auto;'),
        true,
        'Agent 详情页需要显式开启滚动'
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
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/pages/agents/detail/AgentDetailContent.tsx'),
        'utf8'
    );

    assert.equal(
        content.includes('agent-capability-grid'),
        true,
        'Agent 能力区块需要使用紧凑网格'
    );
    assert.equal(
        content.includes('<List'),
        false,
        'Agent 能力区块不应继续使用纵向 List'
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
        content.includes('.agent-skill-card') &&
            content.includes('padding: 14px 16px;'),
        true,
        '内置 Skills 卡片需要收紧内边距'
    );
    assert.equal(
        content.includes('.agent-skill-card-title') &&
            content.includes('font-size: 17px;'),
        true,
        '内置 Skills 标题字号需要提升'
    );
    assert.equal(
        content.includes('.agent-skill-card-description') &&
            content.includes('font-size: 15px;'),
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
