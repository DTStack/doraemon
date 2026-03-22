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

    assert.equal(result.bySlug.get('upload-skill-creator-default-skill-creator').installKey, 'skill-creator');
    assert.equal(result.bySlug.get('upload-skill-creator-default-skill-creator-2').installKey, 'skill-creator-alt');
    assert.equal(result.byInstallKey.get('skill-creator').slug, 'upload-skill-creator-default-skill-creator');
    assert.equal(result.byInstallKey.get('skill-creator-alt').slug, 'upload-skill-creator-default-skill-creator-2');
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
    service.buildSkillDownloadUrl = (slug) => `https://doraemon.test/api/skills/download?slug=${slug}`;

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
    assert.equal(meta.downloadUrl, 'https://doraemon.test/api/skills/download?slug=upload-skill-creator-default-skill-creator');
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
        () => service.assertSkillNamesUnique([ 'skill-a', 'skill-a' ]),
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
        () => service.assertSkillNamesUnique([ 'skill-creator' ]),
        (error) => error.status === 400 && error.message === '技能名称“skill-creator”已存在，请更换名称'
    );
});
