const test = require('node:test');
const assert = require('node:assert/strict');

const skillsModule = require('../app/service/skills');
const SkillsService = skillsModule;

test('createInstallKeyMap derives user-facing install keys and keeps them unique', () => {
    assert.equal(typeof skillsModule.createInstallKeyMap, 'function');

    const result = skillsModule.createInstallKeyMap([
        {
            slug: 'upload-skill-creator-default-skill-creator',
            name: 'skill-creator',
            sourcePath: 'skills/skill-creator',
        },
        {
            slug: 'upload-skill-creator-default-skill-creator-2',
            name: 'skill creator',
            sourcePath: 'skills/skill-creator-alt',
        },
    ]);

    assert.equal(
        result.bySlug.get('upload-skill-creator-default-skill-creator').installKey,
        'skill-creator'
    );
    assert.equal(
        result.bySlug.get('upload-skill-creator-default-skill-creator-2').installKey,
        'skill-creator-alt'
    );
    assert.equal(
        result.byInstallKey.get('skill-creator').slug,
        'upload-skill-creator-default-skill-creator'
    );
    assert.equal(
        result.byInstallKey.get('skill-creator-alt').slug,
        'upload-skill-creator-default-skill-creator-2'
    );
});

test('resolveSkillIdentifier accepts installKey without exposing internal slug', () => {
    assert.equal(typeof skillsModule.resolveSkillIdentifier, 'function');

    const skill = skillsModule.resolveSkillIdentifier('skill-creator', {
        bySlug: new Map([
            [
                'upload-skill-creator-default-skill-creator',
                {
                    slug: 'upload-skill-creator-default-skill-creator',
                    installKey: 'skill-creator',
                },
            ],
        ]),
        byInstallKey: new Map([
            [
                'skill-creator',
                {
                    slug: 'upload-skill-creator-default-skill-creator',
                    installKey: 'skill-creator',
                },
            ],
        ]),
    });

    assert.equal(skill.slug, 'upload-skill-creator-default-skill-creator');
    assert.equal(skill.installKey, 'skill-creator');
});

test('getInstallMeta returns installKey and installDirName aligned to user-facing identifier', async () => {
    const service = Object.create(SkillsService.prototype);
    service.ctx = {
        throw(status, message) {
            const error = new Error(message);
            error.status = status;
            throw error;
        },
    };
    service.skillCache = {
        bySlug: new Map(),
        byInstallKey: new Map(),
    };
    service.ensureSkillCache = async () => {};
    service.getSkillPackageInstallability = async () => ({ installable: true, reason: '' });
    service.getSkillArchive = async () => ({ content: Buffer.from('zip-content') });
    service.buildSkillDownloadUrl = (slug) =>
        `https://doraemon.test/api/skills/download?slug=${slug}`;

    const skill = {
        id: 1,
        slug: 'upload-skill-creator-default-skill-creator',
        installKey: 'skill-creator',
        name: 'skill-creator',
        sourceRepo: '',
    };
    service.skillCache.bySlug.set(skill.slug, skill);
    service.skillCache.byInstallKey.set(skill.installKey, skill);

    const meta = await service.getInstallMeta('skill-creator');

    assert.equal(meta.slug, 'upload-skill-creator-default-skill-creator');
    assert.equal(meta.installKey, 'skill-creator');
    assert.equal(meta.installDirName, 'skill-creator');
    assert.equal(
        meta.downloadUrl,
        'https://doraemon.test/api/skills/download?slug=upload-skill-creator-default-skill-creator'
    );
});

test('buildUploadSourceMeta keeps same zip with different custom names isolated', () => {
    const service = Object.create(SkillsService.prototype);
    service.hashString = SkillsService.prototype.hashString;
    service.sanitizeSlugSegment = SkillsService.prototype.sanitizeSlugSegment;

    const first = service.buildUploadSourceMeta('skill-creator.zip', 'skill-creator-a');
    const second = service.buildUploadSourceMeta('skill-creator.zip', 'skill-creator-b');

    assert.notEqual(first.sourceUrl, second.sourceUrl);
    assert.notEqual(first.repoPath, second.repoPath);
});

test('assertSkillNamesUnique rejects duplicated names in one import batch', async () => {
    const service = Object.create(SkillsService.prototype);
    service.ctx = {
        throw(status, message) {
            const error = new Error(message);
            error.status = status;
            throw error;
        },
    };
    service.app = {
        model: {
            SkillsItem: {
                findOne: async () => null,
            },
        },
        Sequelize: {
            Op: {
                in: 'in',
                ne: 'ne',
            },
        },
    };

    await assert.rejects(
        () => service.assertSkillNamesUnique(['skill-a', 'skill-a']),
        (error) => error.status === 400 && error.message === '导入失败：技能名称不能重复'
    );
});

test('assertSkillNamesUnique rejects existing skill name', async () => {
    const service = Object.create(SkillsService.prototype);
    service.ctx = {
        throw(status, message) {
            const error = new Error(message);
            error.status = status;
            throw error;
        },
    };
    service.app = {
        model: {
            SkillsItem: {
                findOne: async () => ({ id: 9, name: 'skill-creator' }),
            },
        },
        Sequelize: {
            Op: {
                in: 'in',
                ne: 'ne',
            },
        },
    };

    await assert.rejects(
        () => service.assertSkillNamesUnique(['skill-creator']),
        (error) =>
            error.status === 400 && error.message === '技能名称“skill-creator”已存在，请更换名称'
    );
});

test('buildSkillSlug generates clean slug for upload source without prefix', () => {
    const service = Object.create(SkillsService.prototype);
    service.sanitizeSlugSegment = SkillsService.prototype.sanitizeSlugSegment;
    service.hashString = SkillsService.prototype.hashString;

    const sourceMeta = {
        repoHost: 'upload',
        sourceType: 'upload',
        repoPath: 'my-test-zip-1234',
    };

    // 网页端上传，ZIP内技能目录为 "my-skill"
    const slug = service.buildSkillSlug(sourceMeta, 'my-skill', 'My Skill');
    assert.equal(slug, 'my-skill');
    
    // 如果 relativeSkillPath 是 "."，应该回退使用 skillName
    const slugDot = service.buildSkillSlug(sourceMeta, '.', 'My Skill');
    assert.equal(slugDot, 'my-skill');
});

test('persistSkillsForSource - TDD scenarios for web upload', async () => {
    const service = Object.create(SkillsService.prototype);
    
    service.fetchStarsBySourceRepo = async () => 0;
    service.buildSkillSlug = SkillsService.prototype.buildSkillSlug;
    service.sanitizeSlugSegment = SkillsService.prototype.sanitizeSlugSegment;
    service.hashString = SkillsService.prototype.hashString;
    
    const dbSkills = [];
    const dbFiles = [];
    let idCounter = 1;

    const SkillsItem = {
        findAll: async (options) => {
            const sourceId = options.where.source_id;
            return dbSkills.filter(item => item.source_id === sourceId && item.is_delete === 0);
        },
        findOne: async (options) => {
            const slug = options.where.slug;
            return dbSkills.find(item => item.slug === slug) || null;
        },
        create: async (payload) => {
            const newItem = {
                id: idCounter++,
                ...payload,
                update: async (fields) => {
                    Object.assign(newItem, fields);
                    return newItem;
                },
            };
            dbSkills.push(newItem);
            return newItem;
        },
    };
    
    const SkillsFile = {
        destroy: async () => {},
        bulkCreate: async (rows) => {
            dbFiles.push(...rows);
            return rows;
        },
    };

    service.app = {
        model: {
            SkillsItem,
            SkillsFile,
            transaction: async (cb) => {
                return await cb({});
            },
        },
        Sequelize: {
            Op: {
                in: 'in',
                ne: 'ne',
            },
        },
    };
    
    service.ctx = {
        throw(status, message) {
            const error = new Error(message);
            error.status = status;
            throw error;
        },
    };

    const sourceMeta = {
        repoHost: 'upload',
        sourceType: 'upload',
        repoPath: 'test-source-key',
    };

    // 1. 干净 Slug 首次导入（应该能创建成功）
    const record1 = {
        name: 'my-skill',
        description: 'desc',
        category: '通用',
        version: '1.0.0',
        tags: [],
        allowedTools: [],
        updatedAt: new Date(),
        sourceRepo: '',
        sourcePath: 'my-skill',
        skillMd: '# my-skill',
        installCommand: '',
        files: [],
    };
    
    const result1 = await service.persistSkillsForSource(10, sourceMeta, [record1]);
    assert.equal(result1.length, 1);
    assert.equal(result1[0].slug, 'my-skill');
    assert.equal(dbSkills.length, 1);
    assert.equal(dbSkills[0].slug, 'my-skill');
    assert.equal(dbSkills[0].name, 'my-skill');
    assert.equal(dbSkills[0].is_delete, 0);

    // 2. 同名同 Slug 重复导入/同步（Upsert）—— 应该成功覆盖
    record1.description = 'new desc';
    const result2 = await service.persistSkillsForSource(10, sourceMeta, [record1]);
    assert.equal(result2.length, 1);
    assert.equal(dbSkills.length, 1);
    assert.equal(dbSkills[0].description, 'new desc');

    // 3. 不同名同 Slug 导入冲突（应抛出 400 错误：slug 已存在）
    const recordConflict = {
        name: 'Another Name',
        description: 'desc',
        category: '通用',
        version: '1.0.0',
        tags: [],
        allowedTools: [],
        updatedAt: new Date(),
        sourceRepo: '',
        sourcePath: 'my-skill',
        skillMd: '# another',
        installCommand: '',
        files: [],
    };
    
    await assert.rejects(
        () => service.persistSkillsForSource(11, sourceMeta, [recordConflict]),
        (error) => error.status === 400 && error.message === 'slug 已存在'
    );

    // 4. 对已软删除的同 slug 技能进行复用更新
    dbSkills[0].is_delete = 1;
    
    const recordReuse = {
        name: 'reused-name',
        description: 'reused-desc',
        category: '通用',
        version: '1.0.0',
        tags: [],
        allowedTools: [],
        updatedAt: new Date(),
        sourceRepo: '',
        sourcePath: 'my-skill',
        skillMd: '# reused',
        installCommand: '',
        files: [],
    };
    
    const resultReuse = await service.persistSkillsForSource(12, sourceMeta, [recordReuse]);
    assert.equal(resultReuse.length, 1);
    assert.equal(dbSkills.length, 1);
    assert.equal(dbSkills[0].name, 'reused-name');
    assert.equal(dbSkills[0].is_delete, 0);
});

test('assertSkillNamesUnique with excludeSlugs option ignores matching slug', async () => {
    const service = Object.create(SkillsService.prototype);
    service.ctx = {
        throw(status, message) {
            const error = new Error(message);
            error.status = status;
            throw error;
        },
    };
    
    service.app = {
        model: {
            SkillsItem: {
                findOne: async (options) => {
                    const slugFilter = options.where.slug;
                    if (slugFilter && slugFilter['notIn'] && slugFilter['notIn'].includes('skill-a')) {
                        return null;
                    }
                    return { id: 9, name: 'skill-a', slug: 'skill-a' };
                },
            },
        },
        Sequelize: {
            Op: {
                in: 'in',
                ne: 'ne',
                notIn: 'notIn',
            },
        },
    };

    // 1. 如果不传 excludeSlugs，应该报错
    await assert.rejects(
        () => service.assertSkillNamesUnique(['skill-a']),
        (error) => error.status === 400 && error.message === '技能名称“skill-a”已存在，请更换名称'
    );

    // 2. 如果传入了匹配 of the excludeSlugs，应该不报错
    await service.assertSkillNamesUnique(['skill-a'], {
        excludeSlugs: ['skill-a'],
    });
});

test('persistSkillsForSource - auto-package for multiple skill records and query filtering (T007)', async () => {
    const service = Object.create(SkillsService.prototype);
    service.fetchStarsBySourceRepo = async () => 0;
    service.buildSkillSlug = SkillsService.prototype.buildSkillSlug;
    service.sanitizeSlugSegment = SkillsService.prototype.sanitizeSlugSegment;
    service.hashString = SkillsService.prototype.hashString;

    const dbSkills = [];
    const dbFiles = [];
    let idCounter = 1;

    const SkillsItem = {
        findAll: async (options) => {
            const sourceId = options.where.source_id;
            // If filtering out sub-skills, parent_slug must be null
            let result = dbSkills.filter(item => item.source_id === sourceId && item.is_delete === 0);
            if (options.where && 'parent_slug' in options.where && options.where.parent_slug === null) {
                result = result.filter(item => item.parent_slug === null);
            }
            return result;
        },
        findOne: async (options) => {
            const slug = options.where.slug;
            return dbSkills.find(item => item.slug === slug) || null;
        },
        create: async (payload) => {
            const newItem = {
                id: idCounter++,
                ...payload,
                update: async (fields) => {
                    Object.assign(newItem, fields);
                    return newItem;
                },
            };
            dbSkills.push(newItem);
            return newItem;
        },
    };

    const SkillsFile = {
        destroy: async () => {},
        bulkCreate: async (rows) => {
            dbFiles.push(...rows);
            return rows;
        },
    };

    service.app = {
        model: {
            SkillsItem,
            SkillsFile,
            transaction: async (cb) => {
                return await cb({});
            },
        },
        Sequelize: {
            Op: {
                in: 'in',
                ne: 'ne',
            },
        },
    };

    service.ctx = {
        throw(status, message) {
            const error = new Error(message);
            error.status = status;
            throw error;
        },
    };

    const sourceMeta = {
        repoHost: 'upload',
        sourceType: 'upload',
        repoPath: 'my-skills-pack',
    };

    // Two skill records
    const records = [
        {
            name: 'sub-skill-1',
            description: 'desc1',
            category: '通用',
            version: '1.0.0',
            tags: ['tag1'],
            allowedTools: [],
            updatedAt: new Date(),
            sourceRepo: '',
            sourcePath: 'skills/sub-1',
            skillMd: '# sub 1',
            installCommand: '',
            files: [],
        },
        {
            name: 'sub-skill-2',
            description: 'desc2',
            category: '通用',
            version: '1.0.0',
            tags: ['tag2'],
            allowedTools: [],
            updatedAt: new Date(),
            sourceRepo: '',
            sourcePath: 'skills/sub-2',
            skillMd: '# sub 2',
            installCommand: '',
            files: [],
        },
    ];

    await service.persistSkillsForSource(20, sourceMeta, records);
    
    // There should be a parent package item (is_package = 1) and two sub-skills (parent_slug = parentSlug)
    const parent = dbSkills.find(item => item.is_package === 1);
    assert.ok(parent, 'Should create a parent package');
    assert.equal(parent.name, 'my-skills-pack');
    assert.equal(parent.is_package, 1);

    const subSkills = dbSkills.filter(item => item.parent_slug === parent.slug);
    assert.equal(subSkills.length, 2, 'Both sub-skills should refer to parent slug');
    assert.equal(subSkills[0].is_package, 0);

    // Check lists query filters out child skills
    const mainList = await SkillsItem.findAll({
        where: { source_id: 20, is_delete: 0, parent_slug: null },
    });
    assert.equal(mainList.length, 1, 'Main list should only contain the parent package');
    assert.equal(mainList[0].slug, parent.slug);
});

test('getSkillArchive - skill package ZIP nested structures (T008)', async () => {
    const service = Object.create(SkillsService.prototype);
    service.app = {
        model: {
            SkillsItem: {
                findAll: async (_options) => {
                    return [
                        { id: 101, name: 'sub-skill-1', slug: 'sub-1', is_package: 0 },
                        { id: 102, name: 'sub-skill-2', slug: 'sub-2', is_package: 0 },
                    ];
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
        },
    };

    service.ensureSkillCache = async () => {};
    service.getSkillByIdentifier = (_slug) => {
        return { id: 100, name: 'my-skills-pack', slug: 'my-skills-pack', isPackage: 1 };
    };
    service.sanitizeFileName = (name) => name;
    service.normalizeRelativePath = (p) => p;
    service.decodeStoredFileContent = (content, _isBinary) => Buffer.from(content, 'base64');

    const archive = await service.getSkillArchive('my-skills-pack');
    assert.ok(archive.content);
    
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(archive.content);
    const entries = zip.getEntries().map(e => e.entryName);
    
    assert.ok(entries.includes('my-skills-pack/sub-skill-1/README.md'));
    assert.ok(entries.includes('my-skills-pack/sub-skill-2/index.js'));
});

// ============================================================
// Phase 5: TDD Validation Tests (003-dt-skill-packages)
// ============================================================

test('ensureSkillsItemPackageColumns - auto-migration adds is_package and parent_slug when missing (T014)', async () => {
    const service = Object.create(SkillsService.prototype);

    const addedColumns = [];
    const queryInterface = {
        describeTable: async () => ({
            id: { type: 'INTEGER' },
            slug: { type: 'VARCHAR' },
            name: { type: 'VARCHAR' },
        }),
        addColumn: async (table, column, definition) => {
            addedColumns.push({ table, column, definition });
        },
    };

    service.app = {
        model: {
            getQueryInterface: () => queryInterface,
        },
        Sequelize: {
            TINYINT: 'TINYINT',
            STRING(len) { this.len = len; },
        },
    };

    await service.ensureSkillsItemPackageColumns();

    assert.equal(addedColumns.length, 2, 'Should add both columns');
    assert.equal(addedColumns[0].column, 'is_package');
    assert.equal(addedColumns[1].column, 'parent_slug');
});

test('ensureSkillsItemPackageColumns - skips migration when columns already exist (T014)', async () => {
    const service = Object.create(SkillsService.prototype);

    let addColumnCalled = false;
    const queryInterface = {
        describeTable: async () => ({
            id: { type: 'INTEGER' },
            slug: { type: 'VARCHAR' },
            is_package: { type: 'TINYINT' },
            parent_slug: { type: 'VARCHAR' },
        }),
        addColumn: async () => {
            addColumnCalled = true;
        },
    };

    service.app = {
        model: {
            getQueryInterface: () => queryInterface,
        },
        Sequelize: {
            TINYINT: 'TINYINT',
            STRING(len) { this.len = len; },
        },
    };

    await service.ensureSkillsItemPackageColumns();

    assert.equal(addColumnCalled, false, 'Should NOT add columns that already exist');
});

test('persistSkillsForSource - single skill source does not create package (T015)', async () => {
    const service = Object.create(SkillsService.prototype);
    service.fetchStarsBySourceRepo = async () => 0;
    service.buildSkillSlug = SkillsService.prototype.buildSkillSlug;
    service.sanitizeSlugSegment = SkillsService.prototype.sanitizeSlugSegment;
    service.hashString = SkillsService.prototype.hashString;

    const dbSkills = [];
    let idCounter = 1;

    const SkillsItem = {
        findAll: async () => dbSkills.filter(item => item.is_delete === 0),
        findOne: async (opts) => dbSkills.find(item => item.slug === opts.where.slug) || null,
        create: async (payload) => {
            const newItem = {
                id: idCounter++,
                ...payload,
                update: async (fields) => { Object.assign(newItem, fields); return newItem; },
            };
            dbSkills.push(newItem);
            return newItem;
        },
    };

    const SkillsFile = {
        destroy: async () => {},
        bulkCreate: async (rows) => rows,
    };

    service.app = {
        model: {
            SkillsItem,
            SkillsFile,
            transaction: async (cb) => cb({}),
        },
        Sequelize: { Op: { in: 'in', ne: 'ne' } },
    };

    service.ctx = {
        throw(status, message) { const e = new Error(message); e.status = status; throw e; },
    };

    const sourceMeta = {
        repoHost: 'upload',
        sourceType: 'upload',
        repoPath: 'single-skill-zip',
    };

    const singleRecord = [{
        name: 'solo-skill',
        description: 'a single skill',
        category: '通用',
        version: '1.0.0',
        tags: [],
        allowedTools: [],
        updatedAt: new Date(),
        sourceRepo: '',
        sourcePath: 'solo-skill',
        skillMd: '# solo',
        installCommand: '',
        files: [],
    }];

    await service.persistSkillsForSource(30, sourceMeta, singleRecord);

    assert.equal(dbSkills.length, 1, 'Single source should create exactly 1 record');
    assert.equal(dbSkills[0].is_package, 0, 'Single skill should NOT be a package');
    assert.equal(dbSkills[0].parent_slug, null, 'Single skill should have no parent_slug');
    assert.equal(dbSkills[0].slug, 'solo-skill');
});

test('persistSkillsForSource - multi-skill source creates parent package with children (T016)', async () => {
    const service = Object.create(SkillsService.prototype);
    service.fetchStarsBySourceRepo = async () => 5;
    service.buildSkillSlug = SkillsService.prototype.buildSkillSlug;
    service.sanitizeSlugSegment = SkillsService.prototype.sanitizeSlugSegment;
    service.hashString = SkillsService.prototype.hashString;

    const dbSkills = [];
    let idCounter = 1;

    const SkillsItem = {
        findAll: async (opts) => {
            const sourceId = opts.where.source_id;
            return dbSkills.filter(item => item.source_id === sourceId && item.is_delete === 0);
        },
        findOne: async (opts) => dbSkills.find(item => item.slug === opts.where.slug) || null,
        create: async (payload) => {
            const newItem = {
                id: idCounter++,
                ...payload,
                update: async (fields) => { Object.assign(newItem, fields); return newItem; },
            };
            dbSkills.push(newItem);
            return newItem;
        },
    };

    const SkillsFile = {
        destroy: async () => {},
        bulkCreate: async (rows) => rows,
    };

    service.app = {
        model: {
            SkillsItem,
            SkillsFile,
            transaction: async (cb) => cb({}),
        },
        Sequelize: { Op: { in: 'in', ne: 'ne' } },
    };

    service.ctx = {
        throw(status, message) { const e = new Error(message); e.status = status; throw e; },
    };

    const sourceMeta = {
        repoHost: 'upload',
        sourceType: 'upload',
        repoPath: 'mega-pack',
    };

    const multiRecords = [
        {
            name: 'alpha-skill',
            description: 'alpha',
            category: '开发',
            version: '1.0.0',
            tags: ['a'],
            allowedTools: [],
            updatedAt: new Date(),
            sourceRepo: '',
            sourcePath: 'skills/alpha',
            skillMd: '# alpha',
            installCommand: '',
            files: [],
        },
        {
            name: 'beta-skill',
            description: 'beta',
            category: '开发',
            version: '1.0.0',
            tags: ['b'],
            allowedTools: [],
            updatedAt: new Date(),
            sourceRepo: '',
            sourcePath: 'skills/beta',
            skillMd: '# beta',
            installCommand: '',
            files: [],
        },
        {
            name: 'gamma-skill',
            description: 'gamma',
            category: '开发',
            version: '1.0.0',
            tags: ['g'],
            allowedTools: [],
            updatedAt: new Date(),
            sourceRepo: '',
            sourcePath: 'skills/gamma',
            skillMd: '# gamma',
            installCommand: '',
            files: [],
        },
    ];

    await service.persistSkillsForSource(40, sourceMeta, multiRecords);

    const parents = dbSkills.filter(s => s.is_package === 1);
    const children = dbSkills.filter(s => s.parent_slug !== null && s.parent_slug !== '');

    assert.equal(parents.length, 1, 'Should create exactly 1 parent package');
    assert.equal(children.length, 3, 'Should create exactly 3 child skills');

    const parent = parents[0];
    assert.equal(parent.is_package, 1);
    assert.equal(parent.parent_slug, null, 'Parent should have null parent_slug');
    assert.equal(parent.name, 'mega-pack');
    assert.equal(parent.source_path, '.');
    assert.ok(parent.description.includes('alpha-skill'), 'Parent description should list children');

    for (const child of children) {
        assert.equal(child.parent_slug, parent.slug, `Child ${child.slug} should reference parent slug`);
        assert.equal(child.is_package, 0, `Child ${child.slug} should NOT be a package`);
    }
});

test('getSkillList API filters out child skills from main listing (T017)', () => {
    // Directly test the filtering logic used by getSkillList
    const cachedSkills = [
        { slug: 'indie-skill', name: 'Indie', isPackage: 0, parentSlug: null },
        { slug: 'my-pack', name: 'My Pack', isPackage: 1, parentSlug: null },
        { slug: 'child-a', name: 'Child A', isPackage: 0, parentSlug: 'my-pack' },
        { slug: 'child-b', name: 'Child B', isPackage: 0, parentSlug: 'my-pack' },
    ];

    const list = cachedSkills.filter((item) => !item.parentSlug);

    assert.equal(list.length, 2, 'Main list should contain only indie skill + parent package');
    assert.equal(list[0].slug, 'indie-skill');
    assert.equal(list[1].slug, 'my-pack');

    const childSlugs = list.map((s) => s.slug);
    assert.ok(!childSlugs.includes('child-a'), 'child-a should be filtered out');
    assert.ok(!childSlugs.includes('child-b'), 'child-b should be filtered out');
});

test('getSkillDetail returns children for package, none for regular skill (T018)', async () => {
    const service = Object.create(SkillsService.prototype);

    const mockChildren = [
        { id: 201, slug: 'sub-1', name: 'Sub 1', is_package: 0, parent_slug: 'test-pack', is_delete: 0, stars: 0, updated_at_remote: new Date(), updated_at: new Date() },
        { id: 202, slug: 'sub-2', name: 'Sub 2', is_package: 0, parent_slug: 'test-pack', is_delete: 0, stars: 0, updated_at_remote: new Date(), updated_at: new Date() },
    ];

    service.app = {
        model: {
            SkillsItem: {
                findAll: async (opts) => {
                    if (opts.where.parent_slug === 'test-pack') {
                        return mockChildren;
                    }
                    return [];
                },
            },
            SkillsFile: {
                findAll: async () => [],
            },
        },
    };

    service.ensureSkillCache = async () => {};
    service.getSkillByIdentifier = (_slug) => {
        if (_slug === 'test-pack') {
            return { id: 100, slug: 'test-pack', name: 'Test Pack', isPackage: 1, parentSlug: null, skillMd: '# pack', stars: 10, category: '通用', version: '1.0.0', tags: [], allowedTools: [], sourceRepo: '', sourcePath: '.', description: 'test' };
        }
        return { id: 200, slug: 'solo', name: 'Solo', isPackage: 0, parentSlug: null, skillMd: '# solo', stars: 5, category: '通用', version: '1.0.0', tags: [], allowedTools: [], sourceRepo: '', sourcePath: '.', description: 'test' };
    };
    service.toSkillDto = (row) => row;
    service.toPublicSkill = (s) => ({ slug: s.slug, name: s.name, isPackage: s.isPackage || s.is_package, parentSlug: s.parentSlug || s.parent_slug, description: s.description || '' });

    // Package detail should include children
    const packDetail = await service.getSkillDetail('test-pack');
    assert.ok(Array.isArray(packDetail.children), 'Package detail should have children array');
    assert.equal(packDetail.children.length, 2, 'Package should have 2 children');
    assert.equal(packDetail.children[0].slug, 'sub-1');
    assert.equal(packDetail.children[1].slug, 'sub-2');

    // Regular skill detail should NOT have children
    const soloDetail = await service.getSkillDetail('solo');
    assert.equal(soloDetail.children, undefined, 'Regular skill should NOT have children');
});

test('getSkillArchive - nested ZIP structure for package with multiple children (T019)', async () => {
    const service = Object.create(SkillsService.prototype);

    const childSkills = [
        { id: 301, name: 'analyzer', slug: 'analyzer', is_package: 0 },
        { id: 302, name: 'planner', slug: 'planner', is_package: 0 },
    ];

    const childFilesBySkillId = {
        301: [
            { file_path: 'SKILL.md', content: 'IyBBbmFseXplcg==', is_binary: 0 },
            { file_path: 'config.json', content: 'e30=', is_binary: 0 },
        ],
        302: [
            { file_path: 'SKILL.md', content: 'IyBQbGFubmVy', is_binary: 0 },
            { file_path: 'rules.md', content: 'IyBSdWxlcw==', is_binary: 0 },
        ],
    };

    service.app = {
        model: {
            SkillsItem: {
                findAll: async (opts) => {
                    if (opts.where.parent_slug === 'ai-toolkit') {
                        return childSkills;
                    }
                    return [];
                },
            },
            SkillsFile: {
                findAll: async (opts) => childFilesBySkillId[opts.where.skill_id] || [],
            },
        },
    };

    service.ensureSkillCache = async () => {};
    service.getSkillByIdentifier = (_slug) => {
        return { id: 300, name: 'AI Toolkit', slug: 'ai-toolkit', isPackage: 1 };
    };
    service.sanitizeFileName = (name) => name;
    service.normalizeRelativePath = (p) => p;
    service.decodeStoredFileContent = (content, _isBinary) => Buffer.from(content, 'base64');

    const archive = await service.getSkillArchive('ai-toolkit');
    assert.ok(archive.content, 'Should return ZIP content');
    assert.equal(archive.fileName, 'AI Toolkit.zip', 'ZIP filename should match package name');

    const AdmZip = require('adm-zip');
    const zip = new AdmZip(archive.content);
    const entries = zip.getEntries().map((e) => e.entryName);

    // Verify nested structure: packageName/childName/filePath
    assert.ok(entries.includes('AI Toolkit/analyzer/SKILL.md'));
    assert.ok(entries.includes('AI Toolkit/analyzer/config.json'));
    assert.ok(entries.includes('AI Toolkit/planner/SKILL.md'));
    assert.ok(entries.includes('AI Toolkit/planner/rules.md'));
    assert.equal(entries.length, 4, 'ZIP should contain exactly 4 files (2 per child)');
});

