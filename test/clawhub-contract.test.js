const test = require('node:test');
const assert = require('node:assert/strict');

const skillFingerprint = require('../contracts/skill-fingerprint');
const goldenVectors = require('../contracts/skill-fingerprint/golden-vectors.v1.json');

// Mock app and ctx helpers
function createMockApp(models = {}) {
    return {
        model: models,
        Sequelize: {
            Op: {
                like: 'like',
                or: 'or',
                lt: 'lt',
                eq: 'eq',
                in: 'in',
                ne: 'ne',
            },
            literal: (v) => v,
        },
        utils: {
            response: (success, data) => ({ success, data }),
        },
    };
}

function createMockCtx(query = {}, params = {}, body = {}, files = []) {
    return {
        query,
        params,
        request: { body, files, headers: {} },
        throw(status, message) {
            const err = new Error(message);
            err.status = status;
            throw err;
        },
        logger: { warn: () => {}, info: () => {} },
        set: () => {},
        status: 200,
        body: null,
    };
}

// Load the service module
const ClawhubService = require('../app/service/clawhub');

// ============================================================
// Phase 2: Foundation Tests (T005)
// ============================================================

test('ClawhubService can be instantiated with mock app and ctx', () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp();
    service.ctx = createMockCtx();
    assert.equal(typeof service.getRegistryMetadata, 'function');
});

// ============================================================
// Phase 3: US1 Discovery Tests (T006-T011)
// ============================================================

test('getRegistryMetadata returns well-known config', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp();
    service.ctx = createMockCtx();

    const meta = await service.getRegistryMetadata('http://10.0.0.8:7001');
    assert.equal(meta.apiBase, 'http://10.0.0.8:7001');
    assert.equal(meta.authBase, null);
    assert.equal(meta.minCliVersion, '0.9.0');
});

test('searchSkills returns flat results with score 1.0', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findAll: async () => [
                {
                    slug: 'react-skill',
                    name: 'React Skill',
                    description: 'React description',
                    version: '1.0.0',
                    stars: 5,
                    updated_at: new Date('2026-05-21T10:00:00Z'),
                },
            ],
        },
    });
    service.ctx = createMockCtx();

    const results = await service.searchSkills('react', 10);
    assert.equal(results.length, 1);
    assert.equal(results[0].slug, 'react-skill');
    assert.equal(results[0].displayName, 'React Skill');
    assert.equal(results[0].summary, 'React description');
    assert.equal(results[0].version, '1.0.0');
    assert.equal(results[0].score, 1.0);
    assert.equal(results[0].updatedAt, new Date('2026-05-21T10:00:00Z').getTime());
    assert.equal(results[0].ownerHandle, null);
    assert.equal(results[0].owner, null);
});

test('searchSkills with empty query returns all skills', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findAll: async () => [],
        },
    });
    service.ctx = createMockCtx();

    const results = await service.searchSkills('', 10);
    assert.equal(results.length, 0);
});

test('listSkills returns items with cursor pagination', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findAll: async () => [
                {
                    id: 2,
                    slug: 'skill-b',
                    name: 'Skill B',
                    description: 'Desc B',
                    version: '1.0.0',
                    tags: '["test"]',
                    stars: 3,
                    created_at: new Date('2026-05-21T10:00:00Z'),
                    updated_at: new Date('2026-05-21T10:00:00Z'),
                },
                {
                    id: 1,
                    slug: 'skill-a',
                    name: 'Skill A',
                    description: 'Desc A',
                    version: '2.0.0',
                    tags: '[]',
                    stars: 10,
                    created_at: new Date('2026-05-21T09:00:00Z'),
                    updated_at: new Date('2026-05-21T09:00:00Z'),
                },
            ],
        },
    });
    service.ctx = createMockCtx();

    const data = await service.listSkills(null, 'stars', 2);
    assert.equal(data.items.length, 2);
    assert.ok(Array.isArray(data.items));
    assert.ok('nextCursor' in data);

    const first = data.items[0];
    assert.equal(first.slug, 'skill-b');
    assert.equal(first.displayName, 'Skill B');
    assert.equal(first.summary, 'Desc B');
    assert.deepEqual(first.tags, ['test']);
    assert.deepEqual(first.stats, { stars: 3, downloads: 0 });
    assert.equal(first.createdAt, new Date('2026-05-21T10:00:00Z').getTime());
    assert.equal(first.updatedAt, new Date('2026-05-21T10:00:00Z').getTime());
    assert.deepEqual(first.latestVersion, {
        version: '1.0.0',
        createdAt: new Date('2026-05-21T10:00:00Z').getTime(),
        changelog: '',
        license: null,
    });
});

test('listSkills uses a composite cursor that matches newest sorting', async () => {
    const calls = [];
    const rows = [
        {
            id: 9,
            slug: 'skill-b',
            name: 'Skill B',
            tags: '[]',
            stars: 2,
            created_at: new Date('2026-05-21T10:00:00Z'),
            updated_at: new Date('2026-05-21T10:00:00Z'),
        },
        {
            id: 8,
            slug: 'skill-a',
            name: 'Skill A',
            tags: '[]',
            stars: 1,
            created_at: new Date('2026-05-21T10:00:00Z'),
            updated_at: new Date('2026-05-21T10:00:00Z'),
        },
    ];
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findAll: async (options) => {
                calls.push(options);
                return rows;
            },
        },
    });
    service.ctx = createMockCtx();
    service.ctx.service = { skills: { ensureStorageReady: async () => {} } };

    const firstPage = await service.listSkills(null, 'newest', 1);
    await service.listSkills(firstPage.nextCursor, 'newest', 1);

    assert.deepEqual(calls[0].order, [
        ['updated_at', 'DESC'],
        ['id', 'DESC'],
    ]);
    assert.deepEqual(calls[1].where.or, [
        { updated_at: { lt: new Date('2026-05-21T10:00:00Z') } },
        {
            updated_at: new Date('2026-05-21T10:00:00Z'),
            id: { lt: 9 },
        },
    ]);
});

test('listSkills uses a composite cursor that matches stars sorting', async () => {
    const calls = [];
    const rows = [
        {
            id: 7,
            slug: 'skill-b',
            name: 'Skill B',
            tags: '[]',
            stars: 12,
            created_at: new Date('2026-05-21T10:00:00Z'),
            updated_at: new Date('2026-05-21T10:00:00Z'),
        },
        {
            id: 6,
            slug: 'skill-a',
            name: 'Skill A',
            tags: '[]',
            stars: 12,
            created_at: new Date('2026-05-21T09:00:00Z'),
            updated_at: new Date('2026-05-21T09:00:00Z'),
        },
    ];
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findAll: async (options) => {
                calls.push(options);
                return rows;
            },
        },
    });
    service.ctx = createMockCtx();
    service.ctx.service = { skills: { ensureStorageReady: async () => {} } };

    const firstPage = await service.listSkills(null, 'stars', 1);
    await service.listSkills(firstPage.nextCursor, 'stars', 1);

    assert.deepEqual(calls[0].order, [
        ['stars', 'DESC'],
        ['id', 'DESC'],
    ]);
    assert.deepEqual(calls[1].where.or, [
        { stars: { lt: 12 } },
        {
            stars: 12,
            id: { lt: 7 },
        },
    ]);
});

test('searchSkills ensures the skills schema is ready before querying', async () => {
    const events = [];
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findAll: async () => {
                events.push('query');
                return [];
            },
        },
    });
    service.ctx = createMockCtx();
    service.ctx.service = {
        skills: {
            ensureStorageReady: async () => {
                events.push('migrate');
            },
        },
    };

    await service.searchSkills('demo', 10);

    assert.deepEqual(events, ['migrate', 'query']);
});

test('getSkillDetail returns full skill object', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => ({
                slug: 'my-skill',
                name: 'My Skill',
                description: 'A test skill',
                version: '1.2.3',
                tags: '["test"]',
                stars: 42,
                created_at: new Date('2026-05-21T10:00:00Z'),
                updated_at: new Date('2026-05-21T10:00:00Z'),
            }),
        },
    });
    service.ctx = createMockCtx();

    const data = await service.getSkillDetail('my-skill');
    assert.ok(data);
    assert.equal(data.skill.slug, 'my-skill');
    assert.equal(data.skill.displayName, 'My Skill');
    assert.equal(data.skill.summary, 'A test skill');
    assert.equal(data.skill.version, '1.2.3');
    assert.deepEqual(data.skill.tags, ['test']);
    assert.deepEqual(data.skill.stats, { stars: 42, downloads: 0 });
    assert.equal(data.skill.createdAt, new Date('2026-05-21T10:00:00Z').getTime());
    assert.equal(data.skill.updatedAt, new Date('2026-05-21T10:00:00Z').getTime());
    assert.deepEqual(data.latestVersion, {
        version: '1.2.3',
        createdAt: new Date('2026-05-21T10:00:00Z').getTime(),
        changelog: '',
        license: null,
    });
    assert.equal(data.owner, null);
    assert.equal(data.moderation, null);
});

test('getSkillDetail returns null for missing skill', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => null,
        },
    });
    service.ctx = createMockCtx();

    const data = await service.getSkillDetail('nonexistent');
    assert.equal(data, null);
});

test('getSkillDetail returns children for a package skill', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => ({
                slug: 'my-pack',
                name: 'My Pack',
                description: 'A package',
                version: '1.0.0',
                tags: '[]',
                stars: 5,
                is_package: 1,
                created_at: new Date('2026-05-21T10:00:00Z'),
                updated_at: new Date('2026-05-21T10:00:00Z'),
            }),
            findAll: async (options) => {
                if (options.where.parent_slug === 'my-pack') {
                    return [
                        {
                            id: 2,
                            slug: 'sub-a',
                            name: 'Sub A',
                            description: 'Sub desc',
                            version: '1.0.0',
                            tags: '[]',
                            stars: 3,
                            is_package: 0,
                            parent_slug: 'my-pack',
                            created_at: new Date('2026-05-21T10:00:00Z'),
                            updated_at: new Date('2026-05-21T10:00:00Z'),
                        },
                    ];
                }
                return [];
            },
        },
    });
    service.ctx = createMockCtx();

    const data = await service.getSkillDetail('my-pack');
    assert.ok(data);
    assert.equal(data.skill.isPackage, true);
    assert.equal(data.skill.children.length, 1);
    assert.equal(data.skill.children[0].slug, 'sub-a');
    assert.equal(data.skill.children[0].displayName, 'Sub A');
});

test('listSkillVersions returns single version list', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => ({
                slug: 'my-skill',
                version: '1.0.0',
                updated_at: new Date('2026-05-21T10:00:00Z'),
            }),
        },
    });
    service.ctx = createMockCtx();

    const data = await service.listSkillVersions('my-skill');
    assert.ok(data);
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].version, '1.0.0');
    assert.equal(data.items[0].createdAt, new Date('2026-05-21T10:00:00Z').getTime());
    assert.equal(data.items[0].changelog, '');
    assert.equal(data.items[0].changelogSource, null);
    assert.equal(data.nextCursor, null);
});

test('getSkillVersionDetail returns version for matching current version', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => ({
                slug: 'my-skill',
                name: 'My Skill',
                version: '1.0.0',
                updated_at: new Date('2026-05-21T10:00:00Z'),
            }),
        },
    });
    service.ctx = createMockCtx();

    const data = await service.getSkillVersionDetail('my-skill', '1.0.0');
    assert.ok(data);
    assert.equal(data.version.version, '1.0.0');
    assert.equal(data.version.createdAt, new Date('2026-05-21T10:00:00Z').getTime());
    assert.equal(data.version.changelog, '');
    assert.equal(data.version.changelogSource, null);
    assert.equal(data.version.license, null);
    assert.equal(data.skill.slug, 'my-skill');
    assert.equal(data.skill.displayName, 'My Skill');
});

test('getSkillVersionDetail returns null for non-matching version', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => ({
                slug: 'my-skill',
                name: 'My Skill',
                version: '1.0.0',
                updated_at: new Date(),
            }),
        },
    });
    service.ctx = createMockCtx();

    const data = await service.getSkillVersionDetail('my-skill', '2.0.0');
    assert.equal(data, null);
});

// ============================================================
// Phase 4: US2 Download Tests (T019-T020)
// ============================================================

test('getSkillFileContent returns file content', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => ({ id: 1, slug: 'my-skill' }),
        },
        SkillsFile: {
            findOne: async () => ({
                file_path: 'SKILL.md',
                content: '# Hello',
                is_binary: 0,
            }),
        },
    });
    service.ctx = createMockCtx();

    const data = await service.getSkillFileContent('my-skill', 'SKILL.md');
    assert.ok(data);
    assert.equal(data.content, '# Hello');
    assert.equal(data.path, 'SKILL.md');
});

test('getSkillFileContent returns null for missing file', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => ({ id: 1, slug: 'my-skill' }),
        },
        SkillsFile: {
            findOne: async () => null,
        },
    });
    service.ctx = createMockCtx();

    const data = await service.getSkillFileContent('my-skill', 'MISSING.md');
    assert.equal(data, null);
});

test('buildSkillZip returns zip buffer', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => ({ id: 1, slug: 'my-skill', version: '1.0.0' }),
        },
        SkillsFile: {
            findAll: async () => [{ file_path: 'SKILL.md', content: '# Hello', is_binary: 0 }],
        },
    });
    service.ctx = createMockCtx();

    const result = await service.buildSkillZip('my-skill');
    assert.ok(result);
    assert.ok(result.fileName.includes('my-skill'));
    assert.ok(Buffer.isBuffer(result.content));
    assert.ok(result.content.length > 0);
});

test('buildSkillZip packages skill package nested structure when is_package is 1', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async (options) => {
                if (options.where.slug === 'my-skills-pack') {
                    return { id: 100, slug: 'my-skills-pack', is_package: 1, version: '1.0.0' };
                }
                return null;
            },
            findAll: async (options) => {
                if (options.where.parent_slug === 'my-skills-pack') {
                    return [
                        { id: 101, name: 'sub-skill-1', slug: 'sub-1' },
                        { id: 102, name: 'sub-skill-2', slug: 'sub-2' },
                    ];
                }
                return [];
            },
        },
        SkillsFile: {
            findAll: async (options) => {
                if (options.where.skill_id === 101) {
                    return [
                        { file_path: 'README.md', content: 'c3ViLTE=', is_binary: 0 },
                    ];
                }
                if (options.where.skill_id === 102) {
                    return [
                        { file_path: 'index.js', content: 'c3ViLTI=', is_binary: 0 },
                    ];
                }
                return [];
            },
        },
    });
    service.ctx = createMockCtx();

    const result = await service.buildSkillZip('my-skills-pack');
    assert.ok(result);
    assert.ok(result.fileName.includes('my-skills-pack'));
    assert.ok(Buffer.isBuffer(result.content));

    const AdmZip = require('adm-zip');
    const zip = new AdmZip(result.content);
    const entries = zip.getEntries().map(e => e.entryName);

    assert.ok(entries.includes('my-skills-pack/sub-skill-1/README.md'));
    assert.ok(entries.includes('my-skills-pack/sub-skill-2/index.js'));
});

// ============================================================
// Phase 5: US3 Publish Tests (T024)
// ============================================================

test('validateSemVer accepts valid versions', () => {
    const service = Object.create(ClawhubService.prototype);
    assert.equal(service.validateSemVer('1.0.0'), true);
    assert.equal(service.validateSemVer('0.1.0'), true);
    assert.equal(service.validateSemVer('1.2.3-alpha'), true);
    assert.equal(service.validateSemVer('1.2.3+build.1'), true);
});

test('validateSemVer rejects invalid versions', () => {
    const service = Object.create(ClawhubService.prototype);
    assert.equal(service.validateSemVer('v1.0.0'), false);
    assert.equal(service.validateSemVer('1.0'), false);
    assert.equal(service.validateSemVer('1.0.0.0'), false);
    assert.equal(service.validateSemVer(''), false);
});

test('isBinaryBuffer detects invalid UTF-8 content', () => {
    const service = Object.create(ClawhubService.prototype);

    assert.equal(service.isBinaryBuffer(Buffer.from('valid utf8', 'utf8')), false);
    assert.equal(service.isBinaryBuffer(Buffer.from([0xff, 0xfe, 0xfd])), true);
    assert.equal(service.isBinaryBuffer(Buffer.from([0x61, 0x00, 0x62])), true);
});

test('publishSkill rejects missing SKILL.md', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: { findOne: async () => null },
        SkillsSource: { findOne: async () => null, create: async () => ({ id: 1 }) },
    });
    service.ctx = createMockCtx();
    service.ctx.throw = (status, message) => {
        const err = new Error(message);
        err.status = status;
        throw err;
    };

    await assert.rejects(
        () =>
            service.publishSkill({ slug: 'test', displayName: 'Test', version: '1.0.0' }, [
                { filepath: 'readme.md', content: 'hi' },
            ]),
        /SKILL.md/
    );
});

test('publishSkill returns ok: true and string skillId and versionId', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => null,
            create: async (data) => ({ id: 123, ...data, update: async () => {} }),
        },
        SkillsSource: {
            findOne: async () => ({ id: 1 }),
        },
        SkillsFile: {
            create: async () => ({}),
        },
    });
    service.ctx = createMockCtx();

    const result = await service.publishSkill(
        { slug: 'test-skill', displayName: 'Test Skill', version: '1.0.0' },
        [
            { filepath: 'SKILL.md', content: 'test content' },
        ]
    );

    assert.equal(result.ok, true);
    assert.equal(typeof result.skillId, 'string');
    assert.equal(result.versionId, 'v1.0.0');
});

// ============================================================
// Phase 6: US4 Resolve Tests (T028)
// ============================================================

test('computeSkillFingerprint returns consistent hex string', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsFile: {
            findAll: async () => [
                { file_path: 'a.md', content: 'hello', is_binary: 0 },
                { file_path: 'b.md', content: 'world', is_binary: 0 },
            ],
        },
    });
    service.ctx = createMockCtx();

    const fp1 = await service.computeSkillFingerprint(1);
    const fp2 = await service.computeSkillFingerprint(1);
    assert.equal(typeof fp1, 'string');
    assert.equal(fp1.length, 64);
    assert.equal(fp1, fp2);
});

test('computeSkillFingerprint matches shared golden vectors', async () => {
    const testCase = goldenVectors.cases.find((entry) => entry.name === 'basic-markdown-pair');
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsFile: {
            findAll: async () => [
                ...(testCase.ignoreFiles || []).map((file) => ({
                    file_path: file.path,
                    content: file.content,
                    is_binary: 0,
                })),
                ...testCase.files.map((file) => ({
                    file_path: file.path,
                    content: file.content,
                    is_binary: file.isBinary ? 1 : 0,
                })),
            ],
        },
    });
    service.ctx = createMockCtx();

    const fingerprint = await service.computeSkillFingerprint(1);
    assert.equal(fingerprint, testCase.fingerprint);
});

test('computeSkillFingerprint uses the same text-file set as the CLI', async () => {
    const testCase = goldenVectors.cases.find((entry) => entry.name === 'text-file-set-filtering');
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsFile: {
            findAll: async () => [
                ...(testCase.ignoreFiles || []).map((file) => ({
                    file_path: file.path,
                    content: file.content,
                    is_binary: 0,
                })),
                ...testCase.files.map((file) => ({
                    file_path: file.path,
                    content: file.content,
                    is_binary: file.isBinary ? 1 : 0,
                })),
            ],
        },
    });
    service.ctx = createMockCtx();

    const fingerprint = await service.computeSkillFingerprint(1);
    assert.equal(fingerprint, skillFingerprint.fingerprintFromGoldenCase(testCase));
});

test('computeSkillFingerprint applies stored ignore files like the CLI', async () => {
    const testCase = goldenVectors.cases.find((entry) => entry.name === 'stored-ignore-files');
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsFile: {
            findAll: async () => [
                ...(testCase.ignoreFiles || []).map((file) => ({
                    file_path: file.path,
                    content: file.content,
                    is_binary: 0,
                })),
                ...testCase.files.map((file) => ({
                    file_path: file.path,
                    content: file.content,
                    is_binary: file.isBinary ? 1 : 0,
                })),
            ],
        },
    });
    service.ctx = createMockCtx();

    const fingerprint = await service.computeSkillFingerprint(1);
    assert.equal(fingerprint, skillFingerprint.fingerprintFromGoldenCase(testCase));
});

test('resolveFingerprint ensures storage is ready before querying the skill model', async () => {
    const events = [];
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => {
                events.push('query');
                return null;
            },
        },
    });
    service.ctx = createMockCtx();
    service.ctx.service = {
        skills: {
            ensureStorageReady: async () => {
                events.push('migrate');
            },
        },
    };

    await service.resolveFingerprint('missing-skill', 'hash');

    assert.deepEqual(events, ['migrate', 'query']);
});

test('resolveFingerprint returns match and latestVersion for matching fingerprint', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => ({ id: 1, slug: 'skill-a', version: '1.0.0' }),
        },
        SkillsFile: {
            findAll: async () => [{ file_path: 'SKILL.md', content: 'test', is_binary: 0 }],
        },
    });
    service.ctx = createMockCtx();

    const fp = await service.computeSkillFingerprint(1);
    const result = await service.resolveFingerprint('skill-a', fp);
    assert.ok(result);
    assert.deepEqual(result.match, { version: '1.0.0' });
    assert.deepEqual(result.latestVersion, { version: '1.0.0' });
});

test('resolveFingerprint returns null match for unmatched fingerprint but valid slug', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => ({ id: 1, slug: 'skill-a', version: '1.0.0' }),
        },
        SkillsFile: {
            findAll: async () => [{ file_path: 'SKILL.md', content: 'test', is_binary: 0 }],
        },
    });
    service.ctx = createMockCtx();

    const result = await service.resolveFingerprint('skill-a', 'wrong_hash');
    assert.ok(result);
    assert.equal(result.match, null);
    assert.deepEqual(result.latestVersion, { version: '1.0.0' });
});

test('resolveFingerprint returns null values for missing slug', async () => {
    const service = Object.create(ClawhubService.prototype);
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => null,
        },
    });
    service.ctx = createMockCtx();

    const result = await service.resolveFingerprint('nonexistent', 'any_hash');
    assert.ok(result);
    assert.equal(result.match, null);
    assert.equal(result.latestVersion, null);
});

// ============================================================
// Phase 7: US5 Management Tests (T032-T033)
// ============================================================

test('deleteSkill sets is_delete to 1', async () => {
    const service = Object.create(ClawhubService.prototype);
    const skill = { update: async (data) => Object.assign(skill, data) };
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => skill,
        },
    });
    service.ctx = createMockCtx();

    const result = await service.deleteSkill('my-skill');
    assert.equal(result.ok, true);
    assert.equal(skill.is_delete, 1);
});

test('undeleteSkill sets is_delete to 0', async () => {
    const service = Object.create(ClawhubService.prototype);
    const skill = { is_delete: 1, update: async (data) => Object.assign(skill, data) };
    service.app = createMockApp({
        SkillsItem: {
            findOne: async () => skill,
        },
    });
    service.ctx = createMockCtx();

    const result = await service.undeleteSkill('my-skill');
    assert.equal(result.ok, true);
    assert.equal(skill.is_delete, 0);
});

// ============================================================
// Controller Tests
// ============================================================

test('ClawhubController returns flat JSON (no wrapper)', async () => {
    const ClawhubController = require('../app/controller/clawhub');
    const controller = Object.create(ClawhubController.prototype);
    controller.ctx = createMockCtx();
    controller.ctx.service = {
        clawhub: {
            getRegistryMetadata: async () => ({ apiBase: '/api/v1' }),
        },
    };

    await controller.registryMetadata();
    assert.deepEqual(controller.ctx.body, { apiBase: '/api/v1' });
});
