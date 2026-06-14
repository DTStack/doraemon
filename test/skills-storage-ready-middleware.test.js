const test = require('node:test');
const assert = require('node:assert/strict');

const createSkillsStorageReady = require('../app/middleware/skillsStorageReady');

test('skillsStorageReady 中间件在路由处理前完成数据库迁移', async () => {
    const skillsStorageReady = createSkillsStorageReady();
    const events = [];
    const ctx = {
        service: {
            skills: {
                ensureStorageReady: async () => {
                    events.push('migrate');
                },
            },
        },
    };

    await skillsStorageReady(ctx, async () => {
        events.push('handler');
    });

    assert.deepEqual(events, ['migrate', 'handler']);
});

test('skillsStorageReady 中间件在迁移后继续抛出路由处理错误', async () => {
    const skillsStorageReady = createSkillsStorageReady();
    const ctx = {
        service: {
            skills: {
                ensureStorageReady: async () => {},
            },
        },
    };

    await assert.rejects(
        () =>
            skillsStorageReady(ctx, async () => {
                throw new Error('handler failed');
            }),
        /handler failed/
    );
});

test('skillsStorageReady 中间件在多个请求之间只初始化一次存储', async () => {
    let migrationCount = 0;
    const middleware = createSkillsStorageReady();
    const createCtx = () => ({
        service: {
            skills: {
                ensureStorageReady: async () => {
                    migrationCount += 1;
                },
            },
        },
    });

    await middleware(createCtx(), async () => {});
    await middleware(createCtx(), async () => {});

    assert.equal(migrationCount, 1);
});

test('skillsStorageReady 中间件在初始化失败后允许重试', async () => {
    let migrationCount = 0;
    const middleware = createSkillsStorageReady();
    const ctx = {
        service: {
            skills: {
                ensureStorageReady: async () => {
                    migrationCount += 1;
                    if (migrationCount === 1) {
                        throw new Error('migration failed');
                    }
                },
            },
        },
    };

    await assert.rejects(() => middleware(ctx, async () => {}), /migration failed/);
    await middleware(ctx, async () => {});

    assert.equal(migrationCount, 2);
});
