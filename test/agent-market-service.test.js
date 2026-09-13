const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const AgentsService = require('../app/service/agents');

function createService() {
    const service = Object.create(AgentsService.prototype);
    service.ctx = {
        logger: {
            info() {},
            warn() {},
            error() {},
        },
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

test('normalizeCapabilities 兼容字符串和对象数组', () => {
    const service = createService();

    assert.deepEqual(service.normalizeCapabilities(['分析 Bug', { id: 'fix', name: '修复代码' }]), [
        { id: '', name: '分析 Bug', description: '' },
        { id: 'fix', name: '修复代码', description: '' },
    ]);
});

test('getAgentArchiveStream 返回当前 hash 对应的原始 ZIP', async () => {
    const service = createService();
    const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-archive-download-'));
    const archiveDir = path.join(storageDir, 'bugfix-agent', 'hash-current');
    const archivePath = path.join(archiveDir, 'bugfix-agent.zip');
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(archivePath, Buffer.from('download-agent-zip'));
    service.app.config.agentMarket.storageDir = storageDir;
    service.storageReady = true;
    service.app.model = {
        Agent: {
            async findOne() {
                return {
                    name: 'bugfix-agent',
                    content_hash: 'hash-current',
                    is_delete: 0,
                };
            },
        },
    };

    try {
        const result = await service.getAgentArchiveStream('bugfix-agent');
        const chunks = [];
        for await (const chunk of result.stream) chunks.push(chunk);
        assert.equal(Buffer.concat(chunks).toString('utf8'), 'download-agent-zip');
        assert.equal(result.fileName, 'bugfix-agent.zip');
        assert.equal(result.mimeType, 'application/zip');
    } finally {
        fs.rmSync(storageDir, { recursive: true, force: true });
    }
});

test('getAgentDetail 返回规范化的 plugin 展示字段', async () => {
    const service = createService();
    service.storageReady = true;
    const row = {
        name: 'bugfix-agent',
        display_name: 'Bugfix Agent',
        description: 'Agent 简短描述',
        profile: '负责 Bug 分析、修复和回归验证',
        author_name: 'DTStack',
        category: '工程效率',
        tags: '["Bugfix"]',
        prompts: '[{"title":"开场问题 1","prompt":"$bugfix-workflow 156343"}]',
        capabilities: '["Interactive","Read"]',
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
    assert.equal(detail.longDescription, '负责 Bug 分析、修复和回归验证');
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

test('getRelatedAgents 在无关联技能时返回空数组，不进行无效查询', async () => {
    const service = createService();
    service.storageReady = true;
    service.app.model = {
        Agent: {
            async findOne() {
                return { id: 1, name: 'agent-1' };
            },
        },
        AgentSkill: {
            async findAll() {
                return [];
            },
        },
    };

    const result = await service.getRelatedAgents('agent-1');
    assert.deepEqual(result, []);
});

test('getRelatedAgents 根据技能重叠数降序推荐相关 Agent 并排除自身', async () => {
    const service = createService();
    service.storageReady = true;
    service.app.Sequelize = { Op: { ne: Symbol('ne') } };

    service.app.model = {
        Agent: {
            async findOne({ where }) {
                if (where.name === 'target-agent') {
                    return { id: 1, name: 'target-agent' };
                }
                return null;
            },
            async findAll({ where }) {
                const agents = [
                    {
                        id: 2,
                        name: 'agent-high-overlap',
                        display_name: 'High Overlap Agent',
                        updated_at: new Date('2026-01-01T00:00:00Z'),
                    },
                    {
                        id: 3,
                        name: 'agent-low-overlap',
                        display_name: 'Low Overlap Agent',
                        updated_at: new Date('2026-01-02T00:00:00Z'),
                    },
                ];
                return agents.filter((a) => where.id.includes(a.id));
            },
        },
        AgentSkill: {
            async findAll({ where }) {
                // target agent skills query
                if (where.agent_id === 1) {
                    return [{ skill_slug: 'skill-a' }, { skill_slug: 'skill-b' }];
                }
                // related skills query
                return [
                    { agent_id: 2, skill_slug: 'skill-a' },
                    { agent_id: 2, skill_slug: 'skill-b' },
                    { agent_id: 3, skill_slug: 'skill-a' },
                ];
            },
        },
    };

    const result = await service.getRelatedAgents('target-agent', 10);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'agent-high-overlap');
    assert.equal(result[0].overlapCount, 2);
    assert.equal(result[1].name, 'agent-low-overlap');
    assert.equal(result[1].overlapCount, 1);
});

test('deleteAgent 软删除 Agent 并清理 AgentSkill 关联数据', async () => {
    const service = createService();
    service.storageReady = true;
    service.getAgentMarketConfig = () => ({ storageDir: '/tmp/test-storage' });
    service.removeDirectory = () => {};

    let agentUpdated = false;
    let skillsDestroyed = false;

    service.app.model = {
        Agent: {
            async findOne() {
                return { id: 10, name: 'test-agent', content_hash: 'hash-1' };
            },
            async update(values, { where }) {
                if (values.is_delete === 1 && where.id === 10) {
                    agentUpdated = true;
                }
            },
        },
        AgentSkill: {
            async destroy({ where }) {
                if (where.agent_id === 10) {
                    skillsDestroyed = true;
                }
            },
        },
        async transaction(callback) {
            return await callback({});
        },
    };

    const res = await service.deleteAgent({ name: 'test-agent' });
    assert.equal(res.deleted, true);
    assert.equal(agentUpdated, true);
    assert.equal(skillsDestroyed, true);
});

test('ensureAgentSkillsTableCompatible 兼容处理历史 relation_type 非空约束', async () => {
    const service = createService();
    let changed = false;
    service.app.Sequelize = { STRING: (len) => `VARCHAR(${len})` };
    service.app.model = {
        getQueryInterface() {
            return {
                async describeTable() {
                    return {
                        relation_type: {
                            type: 'VARCHAR(20)',
                            allowNull: false,
                        },
                    };
                },
                async changeColumn(table, col, def) {
                    if (
                        table === 'agent_skills' &&
                        col === 'relation_type' &&
                        def.allowNull === true
                    ) {
                        changed = true;
                    }
                },
            };
        },
    };

    await service.ensureAgentSkillsTableCompatible();
    assert.equal(changed, true);
});

test('queryAgentList 返回列表中每个 Agent 的 skillCount 统计', async () => {
    const service = createService();
    service.storageReady = true;
    service.app.Sequelize = { Op: { like: Symbol('like'), or: Symbol('or') } };
    service.buildAssetUrl = (name, p) => `/asset/${name}/${p}`;

    const agent1 = {
        id: 101,
        name: 'agent-101',
        display_name: 'Agent 101',
        version: '1.0.2',
        updated_at: new Date('2026-01-01T00:00:00Z'),
        toJSON() {
            return { ...this };
        },
    };
    const agent2 = {
        id: 102,
        name: 'agent-102',
        display_name: 'Agent 102',
        version: '2.0.0',
        updated_at: new Date('2026-01-02T00:00:00Z'),
        toJSON() {
            return { ...this };
        },
    };

    service.app.model = {
        Agent: {
            async findAndCountAll() {
                return {
                    count: 2,
                    rows: [agent1, agent2],
                };
            },
        },
        AgentSkill: {
            async findAll({ where }) {
                assert.deepEqual(where.agent_id, [101, 102]);
                return [
                    { agent_id: 101, skill_slug: 'skill-1' },
                    { agent_id: 101, skill_slug: 'skill-2' },
                    { agent_id: 101, skill_slug: 'skill-3' },
                    { agent_id: 101, skill_slug: 'skill-4' },
                    { agent_id: 101, skill_slug: 'skill-5' },
                    { agent_id: 101, skill_slug: 'skill-6' },
                    { agent_id: 101, skill_slug: 'skill-7' },
                    { agent_id: 101, skill_slug: 'skill-8' },
                    { agent_id: 102, skill_slug: 'skill-a' },
                ];
            },
        },
    };

    const res = await service.queryAgentList({});
    assert.equal(res.total, 2);
    assert.equal(res.list.length, 2);
    assert.equal(res.list[0].name, 'agent-101');
    assert.equal(res.list[0].skillCount, 8);
    assert.equal(res.list[1].name, 'agent-102');
    assert.equal(res.list[1].skillCount, 1);
});

test('formatGitCloneError 格式化并简化 Git 报错信息', () => {
    const service = createService();

    // 远程分支不存在时返回简洁明确的提示
    const branchErrZh = {
        stderr: Buffer.from(
            "正克隆到 'operator-register-agent'...\n警告：重定向到 http://gitlab.prod.dtstack.cn/repo.git/\n致命错误：远程分支 master 在上游 origin 未发现\n"
        ),
    };
    assert.equal(
        service.formatGitCloneError(branchErrZh, 'master'),
        '未在远端仓库找到分支「master」，请在设置中检查分支名称（如 master 或 main）'
    );

    const branchErrEn = {
        stderr: Buffer.from(
            "Cloning into 'operator-register-agent'...\nfatal: Remote branch feat/x not found in upstream origin\n"
        ),
    };
    assert.equal(
        service.formatGitCloneError(branchErrEn, 'feat/x'),
        '未在远端仓库找到分支「feat/x」，请在设置中检查分支名称（如 master 或 main）'
    );

    // 认证失败提示
    const authErr = {
        stderr: Buffer.from(
            "fatal: Authentication failed for 'http://gitlab.prod.dtstack.cn/repo.git'\n"
        ),
    };
    assert.equal(
        service.formatGitCloneError(authErr),
        'Git 认证失败，请检查 env.json 或环境变量中是否配置了有效的 gitlabToken'
    );

    // 仓库不存在提示
    const notFoundErr = {
        stderr: Buffer.from(
            "remote: The project you were looking for could not be found.\nfatal: repository 'xxx' not found\n"
        ),
    };
    assert.equal(
        service.formatGitCloneError(notFoundErr),
        '未找到远程仓库，请检查仓库地址是否正确或是否有权限访问'
    );

    // 网络连接失败提示
    const networkErr = {
        stderr: Buffer.from(
            "fatal: unable to access 'http://gitlab.prod.dtstack.cn/...': Could not resolve host\n"
        ),
    };
    assert.equal(
        service.formatGitCloneError(networkErr),
        '连接远程仓库失败，请检查网络连接或仓库地址'
    );

    // 未知错误过滤进度与警告日志，提取核心 fatal 信息
    const unknownErr = {
        stderr: Buffer.from(
            "正克隆到 'test'...\n警告：重定向到 http://gitlab.prod.dtstack.cn/test.git/\n致命错误：磁盘空间不足\n"
        ),
    };
    assert.equal(service.formatGitCloneError(unknownErr), '磁盘空间不足');
});

test('normalizeGitSource 解析并规范化 Git 仓库地址及分支', () => {
    const service = createService();

    // 1. 标准 Git URL
    const res1 = service.normalizeGitSource(
        'http://gitlab.prod.dtstack.cn/frontend/my-agent.git',
        'master'
    );
    assert.equal(res1.cleanGitUrl, 'http://gitlab.prod.dtstack.cn/frontend/my-agent.git');
    assert.equal(res1.targetBranch, 'master');
    assert.equal(res1.repoName, 'my-agent');

    // 2. 网页端 URL 带多级斜杠分支
    const res2 = service.normalizeGitSource(
        'http://gitlab.prod.dtstack.cn/frontend/my-agent/-/tree/feat/feature-1'
    );
    assert.equal(res2.cleanGitUrl, 'http://gitlab.prod.dtstack.cn/frontend/my-agent');
    assert.equal(res2.targetBranch, 'feat/feature-1');
    assert.equal(res2.repoName, 'my-agent');

    // 3. 用户显式指定分支优先于 URL 中解析的分支
    const res3 = service.normalizeGitSource(
        'http://gitlab.prod.dtstack.cn/frontend/my-agent/-/tree/dev',
        'release/1.0.0'
    );
    assert.equal(res3.targetBranch, 'release/1.0.0');

    // 4. 拦截非法仓库名称（如包含路径遍历符号 ..）
    assert.throws(
        () => {
            service.normalizeGitSource('http://gitlab.prod.dtstack.cn/frontend/..');
        },
        (err) => err.status === 400 && err.message.includes('非法的 Git 仓库名称')
    );

    // 5. 拦截以选项参数 - 或 . 开头的非法分支名
    assert.throws(
        () => {
            service.normalizeGitSource(
                'http://gitlab.prod.dtstack.cn/frontend/my-agent.git',
                '-oProxyCommand=calc'
            );
        },
        (err) => err.status === 400 && err.message.includes('非法的分支名称')
    );

    assert.throws(
        () => {
            service.normalizeGitSource(
                'http://gitlab.prod.dtstack.cn/frontend/my-agent.git',
                '../release'
            );
        },
        (err) => err.status === 400 && err.message.includes('非法的分支名称')
    );
});

test('getGitAuthArgs 域名白名单与空 host 防护', () => {
    const service = createService();
    service.resolveGitlabToken = () => 'test-token-123';
    service.resolveGitlabHostWhitelist = () => ['gitlab.prod.dtstack.cn'];

    // 1. 合法白名单域名
    const auth1 = service.getGitAuthArgs('http://gitlab.prod.dtstack.cn/frontend/my-agent.git');
    assert.equal(auth1.length, 2);
    assert.equal(auth1[0], '-c');
    assert.match(auth1[1], /^http\.extraHeader=Authorization: Basic [A-Za-z0-9+/=]+$/);
    const expectedBasic = Buffer.from('oauth2:test-token-123').toString('base64');
    assert.equal(auth1[1], `http.extraHeader=Authorization: Basic ${expectedBasic}`);

    // 2. 非白名单域名，不透传 Token
    const auth2 = service.getGitAuthArgs('https://github.com/external/repo.git');
    assert.deepEqual(auth2, []);

    // 3. 非法 URL 或空 host，不透传 Token
    const auth3 = service.getGitAuthArgs('not-a-valid-url');
    assert.deepEqual(auth3, []);

    const auth4 = service.getGitAuthArgs('');
    assert.deepEqual(auth4, []);
});
