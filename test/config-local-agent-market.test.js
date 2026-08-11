const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const createLocalConfig = require('../config/config.local');

test('config.local.js 为 Agent 市场提供仓库内本地存储目录', () => {
    const config = createLocalConfig();
    const expectedStorageDir = path.join(process.cwd(), 'agent-market');

    assert.equal(config.agentMarket.storageDir, expectedStorageDir);
});
