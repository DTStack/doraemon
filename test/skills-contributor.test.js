const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');

const SkillsService = require('../app/service/skills');

function createService() {
    const service = Object.create(SkillsService.prototype);
    service.ctx = {
        logger: { warn() {} },
        throw(status, message) {
            const error = new Error(message);
            error.status = status;
            throw error;
        },
    };
    return service;
}

function createUpdateService() {
    const service = createService();
    let updatedPayload;
    const itemRow = {
        id: 1,
        async update(payload) {
            updatedPayload = payload;
        },
    };

    service.ensureSkillCache = async () => {};
    service.ensureStorageReady = async () => {};
    service.getSkillByIdentifier = () => ({
        id: 1,
        slug: 'demo-skill',
        contributor: '缓存中的旧贡献者',
        tags: [],
    });
    service.assertSkillNamesUnique = async () => {};
    service.invalidateCache = () => {};
    service.app = {
        model: {
            SkillsItem: {
                findOne: async () => itemRow,
            },
            SkillsFile: {},
            transaction: async (callback) => callback({}),
        },
    };

    return {
        service,
        getUpdatedPayload: () => updatedPayload,
    };
}

async function importZipWithContributor(params) {
    const service = createService();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-contributor-import-'));
    const zipPath = path.join(tempDir, 'demo.zip');
    const zip = new AdmZip();
    zip.addFile(
        'demo/SKILL.md',
        Buffer.from('---\nname: demo\ncontributor: Frontmatter 贡献者\n---\n\nDemo')
    );
    zip.writeZip(zipPath);
    let persistedRecords;

    service.ensureStorageReady = async () => {};
    service.assertSkillNamesUnique = async () => {};
    service.upsertSourceRecord = async () => ({
        id: 1,
        update: async () => {},
    });
    service.persistSkillsForSource = async (_sourceId, _sourceMeta, records) => {
        persistedRecords = records;
        return records.map((record) => ({ ...record, slug: 'demo' }));
    };
    service.invalidateCache = () => {};
    service.ensureSkillCache = async () => {};

    try {
        await service.importSkillFile(
            { category: '通用', ...params },
            { filename: 'demo.zip', filepath: zipPath }
        );
        return persistedRecords;
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

test('parseContributor returns one trimmed contributor', () => {
    const service = createService();

    assert.equal(service.parseContributor(' 张三 '), '张三');
    assert.equal(service.parseContributor(['张三', '李四']), '张三');
    assert.equal(service.parseContributor(''), '');
});

test('validateContributor accepts 50 characters and rejects 51 characters', () => {
    const service = createService();

    assert.equal(service.validateContributor('a'.repeat(50)), 'a'.repeat(50));
    assert.throws(() => service.validateContributor('a'.repeat(51)), /贡献者不能超过 50 个字符/);
});

test('applyContributorToSkillRecords applies one contributor to every package record', () => {
    const service = createService();
    const records = [{ name: 'skill-a' }, { name: 'skill-b', contributor: '旧名称' }];

    assert.deepEqual(service.applyContributorToSkillRecords(records, '张三'), [
        { name: 'skill-a', contributor: '张三' },
        { name: 'skill-b', contributor: '张三' },
    ]);
});

test('applyContributorToSkillRecords keeps frontmatter value when request omits contributor', () => {
    const service = createService();
    const records = [{ name: 'skill-a', contributor: 'Frontmatter 作者' }];

    assert.deepEqual(service.applyContributorToSkillRecords(records, '', false), records);
});

test('updateSkill does not overwrite contributor when request omits the field', async () => {
    const { service, getUpdatedPayload } = createUpdateService();

    await service.updateSkill({
        slug: 'demo-skill',
        name: 'Demo Skill',
        category: '通用',
        version: '1.0.0',
        tags: '[]',
    });

    assert.equal(Object.prototype.hasOwnProperty.call(getUpdatedPayload(), 'contributor'), false);
});

test('updateSkill writes null when request explicitly clears contributor', async () => {
    const { service, getUpdatedPayload } = createUpdateService();

    await service.updateSkill({
        slug: 'demo-skill',
        name: 'Demo Skill',
        category: '通用',
        version: '1.0.0',
        tags: '[]',
        contributor: '',
    });

    assert.equal(getUpdatedPayload().contributor, null);
});

test('importSkillFile keeps frontmatter contributor when request omits the field', async () => {
    const records = await importZipWithContributor({});

    assert.equal(records[0].contributor, 'Frontmatter 贡献者');
});

test('importSkillFile overrides frontmatter contributor when request provides the field', async () => {
    const records = await importZipWithContributor({ contributor: '弹框贡献者' });

    assert.equal(records[0].contributor, '弹框贡献者');
});

test('ensureSkillsItemContributorColumn adds nullable VARCHAR(50) when missing', async () => {
    const service = createService();
    const addedColumns = [];
    service.app = {
        model: {
            getQueryInterface: () => ({
                describeTable: async () => ({ id: { type: 'INTEGER' } }),
                addColumn: async (table, column, definition) => {
                    addedColumns.push({ table, column, definition });
                },
            }),
        },
        Sequelize: {
            STRING: (length) => `VARCHAR(${length})`,
        },
    };

    await service.ensureSkillsItemContributorColumn();

    assert.deepEqual(addedColumns, [
        {
            table: 'skills_items',
            column: 'contributor',
            definition: {
                type: 'VARCHAR(50)',
                allowNull: true,
                comment: '贡献者',
            },
        },
    ]);
});

test('ensureSkillsItemContributorColumn leaves an existing column unchanged', async () => {
    const service = createService();
    let addColumnCalled = false;
    service.app = {
        model: {
            getQueryInterface: () => ({
                describeTable: async () => ({ contributor: { type: 'VARCHAR(50)' } }),
                addColumn: async () => {
                    addColumnCalled = true;
                },
            }),
        },
        Sequelize: {
            STRING: (length) => `VARCHAR(${length})`,
        },
    };

    await service.ensureSkillsItemContributorColumn();

    assert.equal(addColumnCalled, false);
});
