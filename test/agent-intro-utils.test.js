const test = require('node:test');
const assert = require('node:assert/strict');

const { buildAgentIntroBlocks } = require('../app/web/pages/agents/detail/intro-utils');

test('buildAgentIntroBlocks 将 longDescription、defaultPrompt 拆成两个展示块', () => {
    const result = buildAgentIntroBlocks({
        longDescription: '第一段\n\n第二段',
        defaultPrompt: [
            { title: '仅分析', prompt: '$bugfix-workflow 分析这个 Bug，但先不要修改代码' },
            { title: '恢复任务', prompt: '$bugfix-workflow 继续处理上一次未完成的 Bug' },
        ],
    });

    assert.deepEqual(result.introParagraphs, ['第一段', '第二段']);
    assert.equal(result.openingQuestions.length, 2);
    assert.equal('openingMessage' in result, false);
});

test('buildAgentIntroBlocks 缺少长描述和默认 prompt 时返回空展示块', () => {
    const result = buildAgentIntroBlocks({
        longDescription: '',
        defaultPrompt: [],
    });

    assert.deepEqual(result.introParagraphs, []);
    assert.deepEqual(result.openingQuestions, []);
});
