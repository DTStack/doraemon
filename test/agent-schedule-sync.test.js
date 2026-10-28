const test = require('node:test');
const assert = require('node:assert/strict');

const syncScheduleFactory = require('../app/schedule/syncGitAgents');

test('syncGitAgents 定时任务配置每小时整点 cron 且工作在 worker 模式', () => {
    const scheduleDef = syncScheduleFactory();
    assert.equal(scheduleDef.schedule.cron, '0 0 * * * *');
    assert.equal(scheduleDef.schedule.type, 'worker');
    assert.equal(scheduleDef.schedule.immediate, false);
});

test('syncGitAgents 定时任务调用 service.agents.syncAllGitAgents', async () => {
    let called = false;
    const scheduleDef = syncScheduleFactory();
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
