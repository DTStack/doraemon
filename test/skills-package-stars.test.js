const test = require('node:test');
const assert = require('node:assert/strict');

const skillsModule = require('../app/service/skills');
const SkillsService = skillsModule;

// ============================================================
// Phase 9: 技能包 Stars 聚合 (T038-T042)
// ============================================================

test('getSkillList aggregates package stars from children (T038)', async () => {
    const service = Object.create(SkillsService.prototype);
    service.toPublicSkill = SkillsService.prototype.toPublicSkill;
    service.getSkillList = SkillsService.prototype.getSkillList;

    // Simulate skillCache with a package and its children
    service.skillCache = {
        loadedAt: Date.now(),
        skills: [
            {
                slug: 'my-pack',
                installKey: 'my-pack',
                name: 'My Pack',
                description: 'A skill package',
                category: '通用',
                version: '1.0.0',
                tags: [],
                allowedTools: [],
                stars: 5, // This is the raw repo stars, should be overridden
                updatedAt: new Date().toISOString(),
                sourceRepo: '',
                sourcePath: '.',
                installCommand: '',
                isPackage: 1,
                parentSlug: null,
                skillMd: '# My Pack',
            },
            {
                slug: 'child-a',
                installKey: 'child-a',
                name: 'Child A',
                description: 'First child',
                category: '通用',
                version: '1.0.0',
                tags: [],
                allowedTools: [],
                stars: 10,
                updatedAt: new Date().toISOString(),
                sourceRepo: '',
                sourcePath: 'child-a',
                installCommand: '',
                isPackage: 0,
                parentSlug: 'my-pack',
                skillMd: '# Child A',
            },
            {
                slug: 'child-b',
                installKey: 'child-b',
                name: 'Child B',
                description: 'Second child',
                category: '通用',
                version: '1.0.0',
                tags: [],
                allowedTools: [],
                stars: 25,
                updatedAt: new Date().toISOString(),
                sourceRepo: '',
                sourcePath: 'child-b',
                installCommand: '',
                isPackage: 0,
                parentSlug: 'my-pack',
                skillMd: '# Child B',
            },
        ],
        categories: ['通用'],
        bySlug: new Map(),
        byInstallKey: new Map(),
    };

    // Build index maps
    service.skillCache.skills.forEach((skill) => {
        service.skillCache.bySlug.set(skill.slug, skill);
        service.skillCache.byInstallKey.set(skill.installKey, skill);
    });

    const result = service.getSkillList({});

    assert.equal(result.total, 1, 'List should only show parent package');
    assert.equal(result.list.length, 1);
    assert.equal(result.list[0].slug, 'my-pack');
    assert.equal(result.list[0].stars, 35,
        `Package stars should be sum of children (10 + 25 = 35), got: ${result.list[0].stars}`);
});

test('getSkillList children keep their original stars (T039)', async () => {
    const service = Object.create(SkillsService.prototype);
    service.toPublicSkill = SkillsService.prototype.toPublicSkill;
    service.getSkillList = SkillsService.prototype.getSkillList;

    service.skillCache = {
        loadedAt: Date.now(),
        skills: [
            {
                slug: 'my-pack',
                installKey: 'my-pack',
                name: 'My Pack',
                description: 'A skill package',
                category: '通用',
                version: '1.0.0',
                tags: [],
                allowedTools: [],
                stars: 5,
                updatedAt: new Date().toISOString(),
                sourceRepo: '',
                sourcePath: '.',
                installCommand: '',
                isPackage: 1,
                parentSlug: null,
                skillMd: '# My Pack',
            },
            {
                slug: 'child-a',
                installKey: 'child-a',
                name: 'Child A',
                description: 'First child',
                category: '通用',
                version: '1.0.0',
                tags: [],
                allowedTools: [],
                stars: 42,
                updatedAt: new Date().toISOString(),
                sourceRepo: '',
                sourcePath: 'child-a',
                installCommand: '',
                isPackage: 0,
                parentSlug: 'my-pack',
                skillMd: '# Child A',
            },
        ],
        categories: ['通用'],
        bySlug: new Map(),
        byInstallKey: new Map(),
    };

    service.skillCache.skills.forEach((skill) => {
        service.skillCache.bySlug.set(skill.slug, skill);
        service.skillCache.byInstallKey.set(skill.installKey, skill);
    });

    const result = service.getSkillList({});
    // Child should be filtered out from list
    assert.equal(result.total, 1);
    assert.equal(result.list[0].slug, 'my-pack');
    assert.equal(result.list[0].stars, 42,
        'Package stars should equal child stars (42)');
});

test('getSkillDetail aggregates package stars from children (T039 variant)', async () => {
    const service = Object.create(SkillsService.prototype);
    service.toPublicSkill = SkillsService.prototype.toPublicSkill;
    service.toSkillDto = SkillsService.prototype.toSkillDto;
    service.parseJsonArray = SkillsService.prototype.parseJsonArray;
    service.getSkillDetail = SkillsService.prototype.getSkillDetail;

    const mockChildren = [
        {
            id: 201,
            slug: 'sub-1',
            name: 'Sub 1',
            description: 'sub one',
            category: '通用',
            version: '1.0.0',
            tags: [],
            allowed_tools: '[]',
            stars: 7,
            updated_at_remote: new Date(),
            updated_at: new Date(),
            created_at: new Date(),
            source_repo: '',
            source_path: 'sub-1',
            skill_md: '# Sub 1',
            install_command: '',
            file_count: 0,
            is_package: 0,
            parent_slug: 'test-pack',
            is_delete: 0,
        },
        {
            id: 202,
            slug: 'sub-2',
            name: 'Sub 2',
            description: 'sub two',
            category: '通用',
            version: '1.0.0',
            tags: [],
            allowed_tools: '[]',
            stars: 13,
            updated_at_remote: new Date(),
            updated_at: new Date(),
            created_at: new Date(),
            source_repo: '',
            source_path: 'sub-2',
            skill_md: '# Sub 2',
            install_command: '',
            file_count: 0,
            is_package: 0,
            parent_slug: 'test-pack',
            is_delete: 0,
        },
    ];

    service.app = {
        model: {
            SkillsFile: {
                findAll: async () => [],
            },
            SkillsItem: {
                findAll: async (opts) => {
                    if (opts.where.parent_slug === 'test-pack') {
                        return mockChildren;
                    }
                    return [];
                },
            },
        },
    };

    service.ensureSkillCache = async () => {};
    service.getSkillByIdentifier = (_slug) => {
        return {
            id: 100,
            slug: 'test-pack',
            installKey: 'test-pack',
            name: 'Test Pack',
            description: 'test',
            category: '通用',
            version: '1.0.0',
            tags: [],
            allowedTools: [],
            stars: 3, // raw repo stars, should be overridden by children sum
            updatedAt: new Date().toISOString(),
            sourceRepo: '',
            sourcePath: '.',
            installCommand: '',
            isPackage: 1,
            parentSlug: null,
            skillMd: '# pack',
        };
    };

    const detail = await service.getSkillDetail('test-pack');

    assert.equal(detail.stars, 20,
        `Package detail stars should be sum of children (7 + 13 = 20), got: ${detail.stars}`);
    assert.equal(detail.children.length, 2);
    assert.equal(detail.children[0].stars, 7, 'Child should keep original stars');
    assert.equal(detail.children[1].stars, 13, 'Child should keep original stars');
});

test('getSkillList does not duplicate count children in list (T040)', async () => {
    const service = Object.create(SkillsService.prototype);
    service.toPublicSkill = SkillsService.prototype.toPublicSkill;
    service.getSkillList = SkillsService.prototype.getSkillList;

    service.skillCache = {
        loadedAt: Date.now(),
        skills: [
            {
                slug: 'standalone-skill',
                installKey: 'standalone-skill',
                name: 'Standalone',
                description: 'A standalone skill',
                category: '通用',
                version: '1.0.0',
                tags: [],
                allowedTools: [],
                stars: 100,
                updatedAt: new Date().toISOString(),
                sourceRepo: '',
                sourcePath: 'standalone',
                installCommand: '',
                isPackage: 0,
                parentSlug: null,
                skillMd: '# Standalone',
            },
            {
                slug: 'my-pack',
                installKey: 'my-pack',
                name: 'My Pack',
                description: 'A package',
                category: '通用',
                version: '1.0.0',
                tags: [],
                allowedTools: [],
                stars: 5,
                updatedAt: new Date().toISOString(),
                sourceRepo: '',
                sourcePath: '.',
                installCommand: '',
                isPackage: 1,
                parentSlug: null,
                skillMd: '# My Pack',
            },
            {
                slug: 'child-1',
                installKey: 'child-1',
                name: 'Child 1',
                description: 'Child skill',
                category: '通用',
                version: '1.0.0',
                tags: [],
                allowedTools: [],
                stars: 8,
                updatedAt: new Date().toISOString(),
                sourceRepo: '',
                sourcePath: 'child-1',
                installCommand: '',
                isPackage: 0,
                parentSlug: 'my-pack',
                skillMd: '# Child 1',
            },
        ],
        categories: ['通用'],
        bySlug: new Map(),
        byInstallKey: new Map(),
    };

    service.skillCache.skills.forEach((skill) => {
        service.skillCache.bySlug.set(skill.slug, skill);
        service.skillCache.byInstallKey.set(skill.installKey, skill);
    });

    const result = service.getSkillList({});

    assert.equal(result.total, 2, 'Should show standalone + package, not children');
    const slugs = result.list.map((s) => s.slug);
    assert.ok(slugs.includes('standalone-skill'));
    assert.ok(slugs.includes('my-pack'));
    assert.ok(!slugs.includes('child-1'), 'Child skill should not appear in list');

    const pack = result.list.find((s) => s.slug === 'my-pack');
    assert.equal(pack.stars, 8, 'Package stars should be sum of children (only one child = 8)');

    const standalone = result.list.find((s) => s.slug === 'standalone-skill');
    assert.equal(standalone.stars, 100, 'Standalone skill stars should be unchanged');
});
