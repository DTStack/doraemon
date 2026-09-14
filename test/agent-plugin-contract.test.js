const test = require('node:test');
const assert = require('node:assert/strict');

const AgentsService = require('../app/service/agents');

function createService() {
    const service = Object.create(AgentsService.prototype);
    service.ctx = {
        throw(status, message) {
            const error = new Error(message);
            error.status = status;
            throw error;
        },
    };
    service.app = {
        config: {
            agentMarket: {
                storageDir: '/data/doraemon/agent-market',
            },
        },
    };
    return service;
}

test('validateCodexManifest 返回规范化的展示与配置字段', () => {
    const codexManifest = {
        name: 'bugfix-agent',
        version: '1.0.0',
        description: 'Bugfix plugin',
        author: { name: 'DTStack' },
        keywords: ['bugfix'],
        skills: './skills/',
        interface: {
            displayName: 'Bugfix Agent',
            longDescription: '负责 Bug 分析、修复和交付',
            developerName: 'DTStack',
            category: 'Coding',
            capabilities: ['Interactive', 'Read', 'Write'],
            defaultPrompt: ['$bugfix-workflow 156343'],
            logo: './assets/logo.png',
        },
    };
    const validated = createService().validateCodexManifest(codexManifest);
    assert.equal(validated.longDescription, '负责 Bug 分析、修复和交付');
    assert.deepEqual(validated.defaultPrompt, ['$bugfix-workflow 156343']);
    assert.equal(validated.displayName, 'Bugfix Agent');
    assert.equal(validated.category, '工程效率');
});

test('validateCodexManifest 支持最多 1024 字符的多行代码块 defaultPrompt 并拦截超长配置', () => {
    const service = createService();
    const baseManifest = {
        name: 'batch-task-agent',
        version: '1.0.0',
        description: '任务类型扩展 Agent',
        author: { name: 'DTStack' },
        skills: './skills/',
        interface: {
            displayName: 'Batch Task Agent',
            category: 'Coding',
            defaultPrompt: [],
        },
    };

    // 1. 包含 >128 字符的多行 scope 代码块（用户实际场景）能够正常校验通过
    const longPrompt =
        '$batch-task-type-agent\n```scope\ntype: FOO_SQL\nid: 56\nreference: DORIS\ndisplayName: Foo SQL\nassociateFunction: true\nfunctionTypeId: 28\nscriptType: true\nscriptTypeId: 25\n```';
    const validManifest = {
        ...baseManifest,
        interface: { ...baseManifest.interface, defaultPrompt: [longPrompt] },
    };
    const res = service.validateCodexManifest(validManifest);
    assert.deepEqual(res.defaultPrompt, [longPrompt]);

    // 2. 超过 1024 字符的 prompt 应该被拦截
    const overLengthPrompt = 'a'.repeat(1025);
    const invalidManifest = {
        ...baseManifest,
        interface: { ...baseManifest.interface, defaultPrompt: [overLengthPrompt] },
    };
    assert.throws(
        () => service.validateCodexManifest(invalidManifest),
        /interface\.defaultPrompt 每条必须是 1024 字符以内的字符串/
    );

    // 3. 支持配置最多 5 条 prompt
    const fivePrompts = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const fiveManifest = {
        ...baseManifest,
        interface: { ...baseManifest.interface, defaultPrompt: fivePrompts },
    };
    const fiveRes = service.validateCodexManifest(fiveManifest);
    assert.deepEqual(fiveRes.defaultPrompt, fivePrompts);

    // 4. 超过 5 条应该被拦截
    const sixPrompts = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    const sixManifest = {
        ...baseManifest,
        interface: { ...baseManifest.interface, defaultPrompt: sixPrompts },
    };
    assert.throws(
        () => service.validateCodexManifest(sixManifest),
        /interface\.defaultPrompt 最多支持 5 条/
    );
});

test('validateClaudeManifest 校验 agents 配置有效性', () => {
    const service = createService();
    assert.throws(
        () => service.validateClaudeManifest({ name: 'bugfix-agent', agents: [] }),
        /\.claude-plugin\/plugin\.json 必须声明 agents/
    );
});

test('getAgentDetail 只返回 plugin 展示契约字段', async () => {
    const service = createService();
    service.storageReady = true;
    const row = {
        id: 1,
        name: 'bugfix-agent',
        display_name: 'Bugfix Agent',
        description: 'Bugfix plugin',
        profile: '负责 Bug 分析、修复和交付',
        author_name: 'DTStack',
        category: '工程效率',
        tags: '["bugfix"]',
        prompts: '[{"title":"开场问题 1","prompt":"$bugfix-workflow 156343"}]',
        capabilities: '["Interactive","Read","Write"]',
        version: '1.0.0',
        logo_path: '',
        updated_at: new Date('2026-01-01T00:00:00Z'),
        toJSON() {
            return { ...this };
        },
    };
    service.app.model = {
        Agent: {
            async findOne() {
                return row;
            },
        },
        AgentSkill: {
            async findAll() {
                return [];
            },
        },
    };

    const detail = await service.getAgentDetail('bugfix-agent');

    assert.equal(detail.longDescription, '负责 Bug 分析、修复和交付');
    assert.deepEqual(detail.defaultPrompt, [
        { title: '开场问题 1', prompt: '$bugfix-workflow 156343' },
    ]);
    assert.deepEqual(detail.skills, []);
    assert.equal('profile' in detail, false);
    assert.equal('prompts' in detail, false);
    assert.equal('entrypoint' in detail, false);
    assert.equal('dependencies' in detail, false);
    assert.equal('privateSkills' in detail, false);
});
