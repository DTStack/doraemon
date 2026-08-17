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

function createAgentZip(manifestOverrides = {}, extraEntries = []) {
    const zip = new AdmZip();
    const root = 'bugfix-agent';
    const manifest = {
        apiVersion: 'doraemon.dtstack.com/v1',
        kind: 'Agent',
        metadata: {
            name: 'bugfix-agent',
            displayName: 'Bugfix Agent',
            version: '1.0.0',
            logo: './assets/logo.png',
            description: 'Agent 简短描述',
            author: {
                name: 'DTStack',
            },
            category: '工程效率',
            tags: ['Bugfix', 'Review'],
        },
        spec: {
            profile: '负责 Bug 分析、修复和回归验证',
            capabilities: ['分析 Bug', '修复代码', '推动回归'],
            prompts: [
                {
                    title: '修复 Bug 并部署 OMP online 环境',
                    prompt: '$bugfix-workflow 156343 dataApi 6.0.x，使用来源分支 dataApi/release_6.0.x，并部署到匹配的 OMP online 环境',
                },
                {
                    title: '仅分析 Bug',
                    prompt: '分析 Bug 156372，应用 batch，版本 6.2.x，只做根因分析，先不要修改代码',
                },
                {
                    title: '指定 hotfix 与负责人',
                    prompt: '$bugfix-workflow 156460 stream 6.2.x hotfix zhaoge',
                },
            ],
            demo: {
                images: [
                    {
                        path: './assets/demo1.png',
                        alt: 'Bugfix Agent Demo 1',
                    },
                    {
                        path: './assets/demo2.png',
                        alt: 'Bugfix Agent Demo 2',
                    },
                ],
            },
            entrypoint: {
                host: 'codex',
                type: 'skill',
                name: 'bugfix-workflow',
                ref: './skills/bugfix-workflow',
            },
            dependencies: {
                skills: ['systematic-debugging', 'gitlab-mr-code-review'],
            },
        },
        ...manifestOverrides,
    };

    const yaml = [
        'apiVersion: doraemon.dtstack.com/v1',
        'kind: Agent',
        'metadata:',
        `  name: ${manifest.metadata.name}`,
        `  displayName: ${manifest.metadata.displayName}`,
        `  version: ${manifest.metadata.version}`,
        `  logo: ${manifest.metadata.logo}`,
        `  description: ${manifest.metadata.description}`,
        '  author:',
        `    name: ${manifest.metadata.author.name}`,
        `  category: ${manifest.metadata.category}`,
        '  tags:',
        ...manifest.metadata.tags.map((tag) => `    - ${tag}`),
        'spec:',
        `  profile: ${manifest.spec.profile}`,
        '  capabilities:',
        ...manifest.spec.capabilities.map((item) => `    - ${item}`),
        '  prompts:',
        ...manifest.spec.prompts.flatMap((item) => [
            `    - title: ${item.title}`,
            `      prompt: ${item.prompt}`,
        ]),
        '  demo:',
        '    images:',
        ...manifest.spec.demo.images.flatMap((item) => [
            `      - src: ${item.path}`,
            `        alt: ${item.alt}`,
        ]),
        '  entrypoint:',
        `    host: ${manifest.spec.entrypoint.host}`,
        `    type: ${manifest.spec.entrypoint.type}`,
        `    name: ${manifest.spec.entrypoint.name}`,
        `    ref: ${manifest.spec.entrypoint.ref}`,
        '  dependencies:',
        '    skills:',
        ...manifest.spec.dependencies.skills.map((item) => `      - ${item}`),
        '',
    ].join('\n');

    zip.addFile(`${root}/agent.yaml`, Buffer.from(yaml, 'utf8'));
    zip.addFile(`${root}/README.md`, Buffer.from('# Bugfix Agent\n', 'utf8'));
    zip.addFile(`${root}/setup.sh`, Buffer.from('#!/bin/sh\necho setup\n', 'utf8'));
    zip.addFile(`${root}/MIGRATION.md`, Buffer.from('migration notes\n', 'utf8'));
    zip.addFile(
        `${root}/skills/bugfix-workflow/SKILL.md`,
        Buffer.from('# Bugfix Workflow\n', 'utf8')
    );
    zip.addFile(
        `${root}/subagents/bugfix-reviewer.toml`,
        Buffer.from('name = "bugfix-reviewer"\n', 'utf8')
    );
    zip.addFile(
        `${root}/subagents/bugfix-worker.toml`,
        Buffer.from('name = "bugfix-worker"\n', 'utf8')
    );
    zip.addFile(`${root}/assets/logo.png`, Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'));
    zip.addFile(`${root}/assets/demo1.png`, Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'));
    zip.addFile(`${root}/assets/demo2.png`, Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'));

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

test('parseAgentZip 解析单 Agent ZIP 并拆出结构化字段与文件快照', async () => {
    const service = createService();
    const fixture = createAgentZip();

    try {
        const parsed = await service.parseAgentZip(fixture.zipPath);
        assert.equal(parsed.agent.name, 'bugfix-agent');
        assert.equal(parsed.agent.displayName, 'Bugfix Agent');
        assert.equal(parsed.agent.version, '1.0.0');
        assert.equal(parsed.agent.category, '工程效率');
        assert.equal(parsed.agent.authorName, 'DTStack');
        assert.equal(parsed.logo.path.startsWith('bugfix-agent/'), true);
        assert.equal(parsed.demoImages.length, 2);
        assert.deepEqual(
            parsed.skillRelations.map((item) => ({
                slug: item.skillSlug,
                relationType: item.relationType,
            })),
            [
                { slug: 'bugfix-workflow', relationType: 'entrypoint' },
                { slug: 'systematic-debugging', relationType: 'dependency' },
                { slug: 'gitlab-mr-code-review', relationType: 'dependency' },
            ]
        );
        assert.equal(
            parsed.files.some((item) => item.filePath === 'assets/logo.png'),
            false,
            '资源文件不应该写入 agent_files'
        );
        assert.equal(
            parsed.files.some((item) => item.filePath === 'skills/bugfix-workflow/SKILL.md'),
            true
        );
        assert.equal(
            parsed.files.some((item) => item.filePath === 'agent.yaml'),
            true
        );
    } finally {
        fixture.cleanup();
    }
});

test('parseAgentZip 拒绝非法分类', async () => {
    const service = createService();
    const fixture = createAgentZip({
        metadata: {
            name: 'bugfix-agent',
            displayName: 'Bugfix Agent',
            version: '1.0.0',
            logo: './assets/logo.png',
            description: 'Agent 简短描述',
            author: { name: 'DTStack' },
            category: '未知分类',
            tags: ['Bugfix'],
        },
    });

    try {
        await assert.rejects(() => service.parseAgentZip(fixture.zipPath), /category 无效/);
    } finally {
        fixture.cleanup();
    }
});

test('parseAgentZip 支持 demo.images 使用 src 字段', async () => {
    const service = createService();
    const fixture = createAgentZip();

    try {
        const parsed = await service.parseAgentZip(fixture.zipPath);
        assert.equal(parsed.demoImages.length, 2);
        assert.equal(parsed.demoImages[0].originalPath, 'assets/demo1.png');
    } finally {
        fixture.cleanup();
    }
});

test('parseAgentZip 拒绝 demo.images 使用 path 字段', async () => {
    const service = createService();
    const fixture = createAgentZip();

    const zip = new AdmZip(fixture.zipPath);
    const agentYamlEntry = zip.getEntry('bugfix-agent/agent.yaml');
    const yamlContent = agentYamlEntry.getData().toString('utf8').replace(/src:/g, 'path:');
    zip.updateFile('bugfix-agent/agent.yaml', Buffer.from(yamlContent, 'utf8'));
    zip.writeZip(fixture.zipPath);

    try {
        await assert.rejects(
            () => service.parseAgentZip(fixture.zipPath),
            /spec\.demo\.images\[0\] 路径非法/
        );
    } finally {
        fixture.cleanup();
    }
});

test('parseAgentZip 支持 capabilities 使用对象数组并提取 name', async () => {
    const service = createService();
    const fixture = createAgentZip();

    const zip = new AdmZip(fixture.zipPath);
    const yamlContent = [
        'apiVersion: doraemon.dtstack.com/v1',
        'kind: Agent',
        'metadata:',
        '  name: bugfix-agent',
        '  displayName: Bugfix Agent',
        '  version: 1.0.0',
        '  logo: ./assets/logo.png',
        '  description: Agent 简短描述',
        '  author:',
        '    name: DTStack',
        '  category: 工程效率',
        '  tags:',
        '    - Bugfix',
        'spec:',
        '  profile: 负责 Bug 分析、修复和回归验证',
        '  capabilities:',
        '    - id: bug-context',
        '      name: Bug 信息分析',
        '      description: 获取 Bug 上下文',
        '    - id: code-fix',
        '      name: 代码修复',
        '      description: 完成修复',
        '  prompts:',
        '    - title: 修复 Bug 并部署 OMP online 环境',
        '      prompt: $bugfix-workflow 156343 dataApi 6.0.x',
        '  demo:',
        '    images:',
        '      - src: ./assets/demo1.png',
        '        alt: Demo 1',
        '      - src: ./assets/demo2.png',
        '        alt: Demo 2',
        '  entrypoint:',
        '    host: codex',
        '    type: skill',
        '    name: bugfix-workflow',
        '    ref: ./skills/bugfix-workflow',
        '  dependencies:',
        '    skills:',
        '      - systematic-debugging',
        '',
    ].join('\n');
    zip.updateFile('bugfix-agent/agent.yaml', Buffer.from(yamlContent, 'utf8'));
    zip.writeZip(fixture.zipPath);

    try {
        const parsed = await service.parseAgentZip(fixture.zipPath);
        assert.deepEqual(parsed.agent.capabilities, [
            {
                id: 'bug-context',
                name: 'Bug 信息分析',
                description: '获取 Bug 上下文',
            },
            {
                id: 'code-fix',
                name: '代码修复',
                description: '完成修复',
            },
        ]);
    } finally {
        fixture.cleanup();
    }
});

test('normalizeCapabilities 兼容旧的字符串数组存量数据', () => {
    const service = createService();

    assert.deepEqual(service.normalizeCapabilities(['分析 Bug', '修复代码']), [
        {
            id: '',
            name: '分析 Bug',
            description: '',
        },
        {
            id: '',
            name: '修复代码',
            description: '',
        },
    ]);
});

test('compareAgentVersion 按 semver 比较版本号', () => {
    const service = createService();

    assert.equal(service.compareAgentVersion('1.0.0', '1.0.0'), 0);
    assert.equal(service.compareAgentVersion('1.0.1', '1.0.0'), 1);
    assert.equal(service.compareAgentVersion('1.2.0', '1.10.0'), -1);
});

test('buildRelatedAgents 仅按依赖 Skills 交集排序且忽略入口 Skill', () => {
    const service = createService();
    const target = {
        name: 'bugfix-agent',
        dependencies: ['systematic-debugging', 'gitlab-mr-code-review'],
        entrypointName: 'bugfix-workflow',
    };
    const related = service.buildRelatedAgents(
        target,
        [
            {
                name: 'release-conflict-agent',
                displayName: 'Release Conflict Agent',
                dependencies: ['systematic-debugging'],
                entrypointName: 'bugfix-workflow',
                updatedAt: '2026-08-10T12:00:00.000Z',
            },
            {
                name: 'review-agent',
                displayName: 'Review Agent',
                dependencies: ['systematic-debugging', 'gitlab-mr-code-review'],
                entrypointName: 'review-workflow',
                updatedAt: '2026-08-09T12:00:00.000Z',
            },
            {
                name: 'empty-agent',
                displayName: 'Empty Agent',
                dependencies: [],
                entrypointName: 'bugfix-workflow',
                updatedAt: '2026-08-11T12:00:00.000Z',
            },
        ],
        3
    );

    assert.deepEqual(
        related.map((item) => item.name),
        ['review-agent', 'release-conflict-agent']
    );
});

test('writeAgentArchive 将原始 ZIP 保存到当前内容 hash 目录', async () => {
    const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-archive-storage-'));
    const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-archive-source-'));
    const sourcePath = path.join(sourceDir, 'uploaded.zip');
    fs.writeFileSync(sourcePath, Buffer.from('original-agent-zip'));
    const service = createService();
    service.app.config.agentMarket.storageDir = storageDir;

    try {
        const archiveDir = await service.writeAgentArchive(
            {
                name: 'bugfix-agent',
                contentHash: 'hash-v2',
            },
            sourcePath
        );
        const archivePath = path.join(storageDir, 'bugfix-agent', 'hash-v2', 'bugfix-agent.zip');

        assert.equal(archiveDir, path.dirname(archivePath));
        assert.equal(fs.readFileSync(archivePath, 'utf8'), 'original-agent-zip');
    } finally {
        fs.rmSync(storageDir, { recursive: true, force: true });
        fs.rmSync(sourceDir, { recursive: true, force: true });
    }
});

test('getAgentArchiveStream 返回当前 hash 对应的原始 ZIP', async () => {
    const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-archive-download-'));
    const archiveDir = path.join(storageDir, 'bugfix-agent', 'hash-current');
    const archivePath = path.join(archiveDir, 'bugfix-agent.zip');
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(archivePath, Buffer.from('download-agent-zip'));
    const service = createService();
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

function createDetailService() {
    const service = createService();
    service.storageReady = true;
    service.app.Sequelize = { Op: require('sequelize').Op };

    const row = {
        id: 1,
        name: 'bugfix-agent',
        display_name: 'Bugfix Agent',
        description: 'Agent 简短描述',
        profile: '简介',
        author_name: 'DTStack',
        category: '工程效率',
        tags: '[]',
        prompts: '[]',
        capabilities: '[]',
        version: '1.0.0',
        logo_path: '',
        demo_images: '[]',
        updated_at: new Date('2026-01-01T00:00:00Z'),
        entrypoint_ref: 'skills/bugfix-workflow',
        toJSON() {
            return { ...this };
        },
    };

    const skillMdContents = {
        'skills/bugfix-workflow/SKILL.md':
            '---\nname: Bugfix Workflow\n---\n# Bugfix Workflow\n修复 Bug 的完整流程',
        'skills/builtin-review/SKILL.md':
            '---\nname: 内置审查 Skill\n---\n# 内置审查\n用于代码审查',
        'skills/systematic-debugging/SKILL.md':
            '---\nname: Systematic Debugging\n---\n# Systematic Debugging\n系统化调试方法论',
    };

    service.app.model = {
        Agent: {
            async findOne() {
                return row;
            },
        },
        AgentSkill: {
            async findAll() {
                return [
                    { skill_slug: 'bugfix-workflow', relation_type: 'entrypoint', sort_order: 0 },
                    { skill_slug: 'builtin-review', relation_type: 'private', sort_order: 0 },
                    {
                        skill_slug: 'systematic-debugging',
                        relation_type: 'dependency',
                        sort_order: 0,
                    },
                ];
            },
        },
        SkillsItem: {
            async findAll() {
                return [];
            },
        },
        AgentFile: {
            async findAll({ where }) {
                const { Op } = service.app.Sequelize;
                const paths = where.file_path[Op.in] || [];
                return paths
                    .filter((filePath) => skillMdContents[filePath] !== undefined)
                    .map((filePath) => ({
                        file_path: filePath,
                        content: skillMdContents[filePath],
                    }));
            },
        },
    };

    return service;
}

test('getAgentDetail 未收录入口/内置/依赖 Skill 从包内 SKILL.md 回填描述', async () => {
    const detail = await createDetailService().getAgentDetail('bugfix-agent');

    // 核心工作流：未收录时回填 SKILL.md 的 name/description
    assert.equal(detail.entrypoint.name, 'Bugfix Workflow');
    assert.match(detail.entrypoint.description, /修复 Bug/);
    assert.equal(detail.entrypoint.collected, false);

    // 内置 Skills：总是回填，name 取 frontmatter，标记 builtin
    assert.equal(detail.privateSkills.length, 1);
    assert.equal(detail.privateSkills[0].name, '内置审查 Skill');
    assert.match(detail.privateSkills[0].description, /代码审查/);
    assert.equal(detail.privateSkills[0].builtin, true);
    assert.equal(detail.privateSkills[0].path, '');

    // 未收录的依赖 Skills：包内有 SKILL.md 时同样回填
    assert.equal(detail.dependencies.length, 1);
    assert.equal(detail.dependencies[0].name, 'Systematic Debugging');
    assert.match(detail.dependencies[0].description, /系统化调试/);
});

test('getAgentDetail 已收录入口 Skill 用 SkillsItem 描述，且不查包内 SKILL.md', async () => {
    const service = createDetailService();
    service.app.model.SkillsItem.findAll = async () => [
        {
            slug: 'bugfix-workflow',
            name: 'Bugfix Workflow(已收录)',
            description: '来自 Skills Hub 的描述',
        },
    ];
    // 包内不提供 SKILL.md，验证已收录场景不读取它
    service.app.model.AgentFile.findAll = async ({ where }) => {
        const { Op } = service.app.Sequelize;
        const paths = where.file_path[Op.in] || [];
        assert.equal(paths.length, 2); // 仅内置 + 未收录依赖，不再包含入口
        return [];
    };

    const detail = await service.getAgentDetail('bugfix-agent');

    assert.equal(detail.entrypoint.name, 'Bugfix Workflow(已收录)');
    assert.equal(detail.entrypoint.description, '来自 Skills Hub 的描述');
    assert.equal(detail.entrypoint.collected, true);
    // 内置 Skill 无 SKILL.md：name 回退 slug，description 为空（前端显示"暂无描述"）
    assert.equal(detail.privateSkills[0].name, 'builtin-review');
    assert.equal(detail.privateSkills[0].description, '');
});
