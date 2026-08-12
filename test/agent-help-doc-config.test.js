const test = require('node:test');
const assert = require('node:assert/strict');

const envConfig = require('../env.json');

test('env.json 提供 Agent 市场独立帮助文档地址', () => {
    assert.equal(typeof envConfig.agentHelpDocUrl, 'string');
    assert.equal(envConfig.agentHelpDocUrl.length > 0, true, '应配置 agentHelpDocUrl');
    assert.equal(
        envConfig.agentHelpDocUrl.includes('/zh-cn/guide/agent-market'),
        true,
        'Agent 帮助文档应指向 agent-market 文档'
    );
});
