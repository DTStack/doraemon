const test = require('node:test');
const assert = require('node:assert/strict');

const { buildAgentIntroBlocks } = require('../app/web/pages/agents/detail/intro-utils');

test('buildAgentIntroBlocks 将 profile、description、prompts 拆成三个展示块', () => {
    const result = buildAgentIntroBlocks({
        profile: '第一段\n\n第二段',
        description: '欢迎告诉我你当前要处理的 Bug。',
        prompts: [
            { title: '仅分析', prompt: '$bugfix-workflow 分析这个 Bug，但先不要修改代码' },
            { title: '恢复任务', prompt: '$bugfix-workflow 继续处理上一次未完成的 Bug' },
        ],
    });

    assert.deepEqual(result.introParagraphs, ['第一段', '第二段']);
    assert.equal(result.openingMessage, '欢迎告诉我你当前要处理的 Bug。');
    assert.equal(result.openingQuestions.length, 2);
});

test('buildAgentIntroBlocks 缺少开场消息时回退到列表摘要', () => {
    const result = buildAgentIntroBlocks({
        profile: '简介',
        description: '',
        summary: '这是摘要',
        prompts: [],
    });

    assert.equal(result.openingMessage, '这是摘要');
});
