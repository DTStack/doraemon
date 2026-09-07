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
                maxExtractedSize: 200 * 1024 * 1024,
                maxFileCount: 500,
                maxSingleFileSize: 20 * 1024 * 1024,
            },
        },
    };
    return service;
}

function createPluginZip({ includeClaudeManifest = true, version = '1.0.0' } = {}) {
    const zip = new AdmZip();
    const root = 'bugfix-agent';
    const codexManifest = {
        name: root,
        version,
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
    const claudeManifest = {
        name: root,
        version,
        description: 'Bugfix plugin',
        author: { name: 'DTStack' },
        agents: ['./agents/claude/bugfix-worker.md'],
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
    zip.addFile(`${root}/skills/bugfix-workflow/SKILL.md`, Buffer.from('# Bugfix Workflow\n'));
    zip.addFile(
        `${root}/agents/claude/bugfix-worker.md`,
        Buffer.from('---\nname: bugfix-worker\ndescription: worker\n---\n')
    );
    zip.addFile(`${root}/assets/logo.png`, Buffer.from('logo'));

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-plugin-contract-'));
    const zipPath = path.join(tempDir, 'bugfix-agent.zip');
    zip.writeZip(zipPath);
    return {
        zipPath,
        cleanup() {
            fs.rmSync(tempDir, { recursive: true, force: true });
        },
    };
}

test('parseAgentZip 只返回双 manifest 的规范展示字段', async () => {
    const fixture = createPluginZip();

    try {
        const parsed = await createService().parseAgentZip(fixture.zipPath);
        assert.equal(parsed.agent.longDescription, '负责 Bug 分析、修复和交付');
        assert.deepEqual(parsed.agent.defaultPrompt, ['$bugfix-workflow 156343']);
        assert.equal('profile' in parsed.agent, false);
        assert.equal('prompts' in parsed.agent, false);
        assert.equal('entrypointName' in parsed.agent, false);
        assert.equal('skillRelations' in parsed, false);
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
    };

    const detail = await service.getAgentDetail('bugfix-agent');

    assert.equal(detail.longDescription, '负责 Bug 分析、修复和交付');
    assert.deepEqual(detail.defaultPrompt, [
        { title: '开场问题 1', prompt: '$bugfix-workflow 156343' },
    ]);
    assert.equal('profile' in detail, false);
    assert.equal('prompts' in detail, false);
    assert.equal('entrypoint' in detail, false);
    assert.equal('dependencies' in detail, false);
    assert.equal('privateSkills' in detail, false);
});
