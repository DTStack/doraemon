const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');

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
                maxZipSize: 50 * 1024 * 1024,
                maxExtractedSize: 200 * 1024 * 1024,
                maxFileCount: 500,
                maxSingleFileSize: 20 * 1024 * 1024,
                maxImageSize: 5 * 1024 * 1024,
            },
        },
    };
    return service;
}

function createPluginZip({
    codexManifest: codexOverrides = {},
    claudeManifest: claudeOverrides = {},
    includeClaudeManifest = true,
    logoPath = 'assets/logo.png',
    extraEntries = [],
} = {}) {
    const zip = new AdmZip();
    const root = 'bugfix-agent';
    const codexManifest = {
        name: root,
        version: '1.0.0',
        description: 'Agent 简短描述',
        author: { name: 'DTStack' },
        keywords: ['Bugfix', 'Review'],
        skills: './skills/',
        interface: {
            displayName: 'Bugfix Agent',
            longDescription: '负责 Bug 分析、修复和回归验证',
            developerName: 'DTStack',
            category: 'Coding',
            capabilities: ['分析 Bug', '修复代码'],
            defaultPrompt: ['$bugfix-workflow 156343 dataApi/release_6.0.x'],
            logo: `./${logoPath}`,
        },
        ...codexOverrides,
    };
    const claudeManifest = {
        name: root,
        version: '1.0.0',
        description: 'Agent 简短描述',
        author: { name: 'DTStack' },
        agents: ['./agents/claude/bugfix-worker.md'],
        ...claudeOverrides,
    };

    zip.addFile(
        `${root}/.codex-plugin/plugin.json`,
        Buffer.from(JSON.stringify(codexManifest), 'utf8')
    );
    if (includeClaudeManifest) {
        zip.addFile(
            `${root}/.claude-plugin/plugin.json`,
            Buffer.from(JSON.stringify(claudeManifest), 'utf8')
        );
    }
    zip.addFile(
        `${root}/skills/bugfix-workflow/SKILL.md`,
        Buffer.from('# Bugfix Workflow\n', 'utf8')
    );
    zip.addFile(
        `${root}/agents/claude/bugfix-worker.md`,
        Buffer.from('---\nname: bugfix-worker\ndescription: worker\n---\n', 'utf8')
    );
    zip.addFile(`${root}/${logoPath}`, Buffer.from('logo', 'utf8'));
    zip.addFile(`${root}/README.md`, Buffer.from('# Bugfix Agent\n', 'utf8'));
    extraEntries.forEach((entry) => {
        zip.addFile(entry.name, Buffer.from(entry.content || '', entry.encoding || 'utf8'));
    });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-market-test-'));
    const zipPath = path.join(tempDir, 'bugfix-agent.zip');
    zip.writeZip(zipPath);
    return {
        zipPath,
        cleanup() {
            fs.rmSync(tempDir, { recursive: true, force: true });
        },
    };
}

test('parseAgentZip 解析双宿主 plugin 并返回规范展示字段', async () => {
    const fixture = createPluginZip();

    try {
        const parsed = await createService().parseAgentZip(fixture.zipPath);
        assert.equal(parsed.agent.name, 'bugfix-agent');
        assert.equal(parsed.agent.displayName, 'Bugfix Agent');
        assert.equal(parsed.agent.version, '1.0.0');
        assert.equal(parsed.agent.category, '工程效率');
        assert.equal(parsed.agent.authorName, 'DTStack');
        assert.equal(parsed.agent.longDescription, '负责 Bug 分析、修复和回归验证');
        assert.deepEqual(parsed.agent.defaultPrompt, [
            '$bugfix-workflow 156343 dataApi/release_6.0.x',
        ]);
        assert.deepEqual(parsed.agent.keywords, ['Bugfix', 'Review']);
        assert.equal(parsed.agent.logo.path.startsWith('bugfix-agent/'), true);
        assert.equal('profile' in parsed.agent, false);
        assert.equal('prompts' in parsed.agent, false);
        assert.equal('entrypointName' in parsed.agent, false);
        assert.equal('skillRelations' in parsed, false);
        assert.equal(
            parsed.files.some((item) => item.filePath === 'assets/logo.png'),
            false
        );
        assert.equal(
            parsed.files.some((item) => item.filePath === '.claude-plugin/plugin.json'),
            true
        );
        assert.equal(
            parsed.files.some((item) => item.filePath === 'skills/bugfix-workflow/SKILL.md'),
            true
        );
    } finally {
        fixture.cleanup();
    }
});

test('parseAgentZip 拒绝缺少 Claude Code manifest 的 plugin', async () => {
    const fixture = createPluginZip({ includeClaudeManifest: false });

    try {
        await assert.rejects(
            () => createService().parseAgentZip(fixture.zipPath),
            /\.claude-plugin\/plugin\.json/
        );
    } finally {
        fixture.cleanup();
    }
});

test('parseAgentZip 拒绝双 manifest 的版本不一致', async () => {
    const fixture = createPluginZip({ claudeManifest: { version: '2.0.0' } });

    try {
        await assert.rejects(
            () => createService().parseAgentZip(fixture.zipPath),
            /version 必须一致/
        );
    } finally {
        fixture.cleanup();
    }
});

test('parseAgentZip 拒绝超过 Codex 限制的默认 prompt', async () => {
    const fixture = createPluginZip({
        codexManifest: {
            interface: {
                displayName: 'Bugfix Agent',
                longDescription: '描述',
                developerName: 'DTStack',
                category: 'Coding',
                defaultPrompt: ['1', '2', '3', '4'],
                logo: './assets/logo.png',
            },
        },
    });

    try {
        await assert.rejects(
            () => createService().parseAgentZip(fixture.zipPath),
            /defaultPrompt 最多支持 3 条/
        );
    } finally {
        fixture.cleanup();
    }
});

test('parseAgentZip 支持 Codex 官方 .codex-plugin/assets Logo 路径', async () => {
    const fixture = createPluginZip({ logoPath: '.codex-plugin/assets/logo.png' });

    try {
        const parsed = await createService().parseAgentZip(fixture.zipPath);
        assert.match(parsed.agent.logo.path, /\.codex-plugin\/assets\/logo\.png$/);
    } finally {
        fixture.cleanup();
    }
});

test('normalizeCapabilities 兼容字符串和对象数组', () => {
    const service = createService();

    assert.deepEqual(service.normalizeCapabilities(['分析 Bug', { id: 'fix', name: '修复代码' }]), [
        { id: '', name: '分析 Bug', description: '' },
        { id: 'fix', name: '修复代码', description: '' },
    ]);
});

test('compareAgentVersion 按 semver 比较版本号', () => {
    const service = createService();

    assert.equal(service.compareAgentVersion('1.0.0', '1.0.0'), 0);
    assert.equal(service.compareAgentVersion('1.0.1', '1.0.0'), 1);
    assert.equal(service.compareAgentVersion('1.2.0', '1.10.0'), -1);
});

test('writeAgentArchive 将原始 ZIP 保存到当前内容 hash 目录', async () => {
    const service = createService();
    const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-archive-storage-'));
    const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-archive-source-'));
    const sourcePath = path.join(sourceDir, 'source.zip');
    fs.writeFileSync(sourcePath, Buffer.from('original-agent-zip'));
    service.app.config.agentMarket.storageDir = storageDir;

    try {
        const archiveDir = await service.writeAgentArchive(
            { name: 'bugfix-agent', contentHash: 'hash-v2' },
            sourcePath
        );
        const archivePath = path.join(archiveDir, 'bugfix-agent.zip');
        assert.equal(fs.readFileSync(archivePath, 'utf8'), 'original-agent-zip');
    } finally {
        fs.rmSync(storageDir, { recursive: true, force: true });
        fs.rmSync(sourceDir, { recursive: true, force: true });
    }
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
