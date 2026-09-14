const test = require('node:test');
const assert = require('node:assert/strict');

const syncScheduleFactory = require('../app/schedule/syncGitAgents');

test('syncGitAgents 定时任务默认配置 1h 且工作在 worker 模式', () => {
    const mockApp = {
        config: {
            agentMarket: {
                autoSyncInterval: '1h',
            },
        },
    };
    const scheduleDef = syncScheduleFactory(mockApp);
    assert.equal(scheduleDef.schedule.interval, '1h');
    assert.equal(scheduleDef.schedule.type, 'worker');
    assert.equal(scheduleDef.schedule.disable, false);
});

test('syncGitAgents 支持禁用定时任务', () => {
    const mockApp = {
        config: {
            agentMarket: {
                autoSyncInterval: '',
            },
        },
    };
    const scheduleDef = syncScheduleFactory(mockApp);
    assert.equal(scheduleDef.schedule.disable, true);
});

test('syncGitAgents 定时任务调用 service.agents.syncAllGitAgents', async () => {
    let called = false;
    const mockApp = {
        config: {
            agentMarket: {
                autoSyncInterval: '5m',
            },
        },
    };
    const scheduleDef = syncScheduleFactory(mockApp);
    const mockCtx = {
        logger: {
            info() {},
            error() {},
        },
        service: {
            agents: {
                async syncAllGitAgents() {
                    called = true;
                    return [{ name: 'demo-agent', success: true, isContentChanged: true }];
                },
            },
        },
    };

    await scheduleDef.task(mockCtx);
    assert.equal(called, true, '应当调用 syncAllGitAgents');
});
