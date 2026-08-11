'use strict';

function splitParagraphs(content) {
    return String(content || '')
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function buildAgentIntroBlocks(detail = {}) {
    return {
        introParagraphs: splitParagraphs(detail.profile),
        openingMessage: String(detail.description || detail.summary || '').trim(),
        openingQuestions: Array.isArray(detail.prompts) ? detail.prompts : [],
    };
}

module.exports = {
    buildAgentIntroBlocks,
    splitParagraphs,
};
