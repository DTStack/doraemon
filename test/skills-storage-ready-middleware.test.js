const test = require('node:test');
const assert = require('node:assert/strict');

const skillsStorageReady = require('../app/middleware/skillsStorageReady')();

test('skillsStorageReady middleware runs migration before the route handler', async () => {
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

test('skillsStorageReady middleware propagates handler errors after migration', async () => {
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
