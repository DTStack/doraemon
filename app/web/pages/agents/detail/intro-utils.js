'use strict';

function splitParagraphs(content) {
    return String(content || '')
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function buildAgentIntroBlocks(detail = {}) {
    return {
        introParagraphs: splitParagraphs(detail.longDescription),
        openingQuestions: Array.isArray(detail.defaultPrompt) ? detail.defaultPrompt : [],
    };
}

module.exports = {
    buildAgentIntroBlocks,
    splitParagraphs,
};
