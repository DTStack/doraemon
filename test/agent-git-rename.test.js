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
        Sequelize: {
            Op: {
                ne: Symbol('ne'),
            },
        },
    };
    return service;
}

test('updateAgentGitConfig 修改为已被其他 Agent 占用的仓库名时直接拦截抛错', async () => {
    const service = createService();
    const currentAgent = {
        id: 1,
        name: 'operator-register-agent',
        git_url: 'http://gitlab.prod.dtstack.cn/test/operator-register-agent.git',
        git_branch: 'master',
        category: '工程效率',
        update: async () => {},
    };

    service.app.model = {
        Agent: {
            async findOne({ where }) {
                if (where.name === 'operator-register-agent') {
                    return currentAgent;
                }
                if (where.name === 'conflict-agent') {
                    return { id: 2, name: 'conflict-agent', is_delete: 0 };
                }
                return null;
            },
        },
    };

    await assert.rejects(
        () =>
            service.updateAgentGitConfig({
                name: 'operator-register-agent',
                gitUrl: 'http://gitlab.prod.dtstack.cn/test/conflict-agent.git',
            }),
        /已被已有 Agent占用/
    );
});

test('syncGitAgentByName 支持识别平滑重命名并返回新旧名称', async () => {
    const service = createService();
    const currentAgent = {
        id: 10,
        name: 'operator-register-agent',
        git_url: 'http://gitlab.prod.dtstack.cn/test/operator-registration-agent.git',
        git_branch: 'master',
        category: '工程效率',
    };

    service.app.model = {
        Agent: {
            async findOne({ where }) {
                if (where.name === 'operator-register-agent') {
                    return currentAgent;
                }
                return null;
            },
        },
    };

    // mock importAgentFromGit
    service.importAgentFromGit = async (gitUrl, gitBranch, category, options) => {
        assert.equal(options.currentAgent.id, 10);
        assert.equal(options.currentAgent.name, 'operator-register-agent');
        return {
            id: 10,
            name: 'operator-registration-agent',
            oldName: 'operator-register-agent',
            renamed: true,
            version: '1.0.1',
            contentHash: 'hash-new',
            isContentChanged: true,
        };
    };

    const res = await service.syncGitAgentByName('operator-register-agent');
    assert.equal(res.name, 'operator-registration-agent');
    assert.equal(res.oldName, 'operator-register-agent');
    assert.equal(res.renamed, true);
    assert.equal(res.success, true);
});

test('importAgentFromGit 遇到名称冲突时阻止重命名', async () => {
    const service = createService();
    const currentAgent = {
        id: 1,
        name: 'old-agent',
    };

    service.ensureStorageReady = async () => {};
    service.normalizeGitSource = () => ({
        cleanGitUrl: 'http://gitlab.prod.dtstack.cn/test/occupied-agent.git',
        cloneGitUrl: 'http://gitlab.prod.dtstack.cn/test/occupied-agent.git',
        targetBranch: 'master',
        repoName: 'occupied-agent',
    });
    service.getGitAuthArgs = () => [];
    service.runGitCommand = async (args) => {
        if (args.includes('rev-parse')) return { stdout: 'hash123\n' };
        return { stdout: '' };
    };
    service.validateCodexManifest = () => ({
        name: 'occupied-agent',
        displayName: 'Occupied',
        version: '1.0.0',
        description: 'desc',
        authorName: 'author',
    });
    service.validateClaudeManifest = () => ({
        name: 'occupied-agent',
        version: '1.0.0',
    });

    const tmpStorage = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-rename-test-'));
    service.getAgentMarketConfig = () => ({ storageDir: tmpStorage });

    const targetDir = path.join(tmpStorage, 'git_repos', 'occupied-agent');
    fs.mkdirSync(path.join(targetDir, '.codex-plugin'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, '.codex-plugin', 'plugin.json'), '{}');
    fs.writeFileSync(path.join(targetDir, '.claude-plugin', 'plugin.json'), '{}');

    service.parseCodexPluginJson = () => ({});
    service.parseClaudePluginJson = () => ({});

    service.app.model = {
        Agent: {
            async findOne({ where }) {
                if (where.name === 'occupied-agent') {
                    // 已被 id=2 的记录占用
                    return { id: 2, name: 'occupied-agent', is_delete: 0 };
                }
                return null;
            },
        },
    };

    try {
        await assert.rejects(
            () =>
                service.importAgentFromGit(
                    'http://gitlab.prod.dtstack.cn/test/occupied-agent.git',
                    'master',
                    '工程效率',
                    { currentAgent }
                ),
            /已被已有 Agent占用/
        );
    } finally {
        fs.rmSync(tmpStorage, { recursive: true, force: true });
    }
});
