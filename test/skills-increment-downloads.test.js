const test = require('node:test');
const assert = require('node:assert/strict');

const SkillsService = require('../app/service/skills');

test('incrementDownloads increments downloads and preserves updated_at', async () => {
    let incrementCalledWith = null;

    const mockSkillsItem = {
        increment: async (field, options) => {
            incrementCalledWith = { field, options };
            return [1];
        },
    };

    const mockApp = {
        model: {
            SkillsItem: mockSkillsItem,
        },
        Sequelize: {
            col: (colName) => `COL(${colName})`,
        },
    };

    const mockCtx = {
        logger: {
            warn: () => {},
        },
    };

    const service = Object.create(SkillsService.prototype);
    service.app = mockApp;
    service.ctx = mockCtx;
    service.ensureStorageReady = async () => {};
    service.skillCache = {
        bySlug: {
            'test-skill': {
                slug: 'test-skill',
                downloads: 3,
                updatedAt: '2026-10-20T10:00:00.000Z',
            },
        },
    };

    await service.incrementDownloads('test-skill');

    assert.equal(incrementCalledWith.field, 'downloads');
    assert.equal(incrementCalledWith.options.by, 1);
    assert.deepEqual(incrementCalledWith.options.where, { slug: 'test-skill', is_delete: 0 });
    assert.equal(incrementCalledWith.options.silent, true);
    assert.equal(incrementCalledWith.options.attributes.updated_at, 'COL(updated_at)');

    // 验证内存缓存中的下载量已递增，且 updatedAt 保持不变
    assert.equal(service.skillCache.bySlug['test-skill'].downloads, 4);
    assert.equal(service.skillCache.bySlug['test-skill'].updatedAt, '2026-10-20T10:00:00.000Z');
});
