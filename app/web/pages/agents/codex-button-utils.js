'use strict';

const CODEX_NEW_THREAD_URL = 'codex://threads/new';

function buildCodexNewThreadUrl({ prompt, originUrl }) {
    const params = new URLSearchParams();
    params.set('prompt', String(prompt || ''));

    if (originUrl) {
        params.set('originUrl', String(originUrl));
    }

    return `${CODEX_NEW_THREAD_URL}?${params.toString()}`;
}

function buildAgentDetailCodexPrompt(detail = {}, _originUrl, selectedPrompt) {
    const firstPrompt =
        selectedPrompt || (Array.isArray(detail.prompts) ? detail.prompts[0] : null);
    return firstPrompt ? String(firstPrompt.prompt || '') : '';
}

module.exports = {
    buildAgentDetailCodexPrompt,
    buildCodexNewThreadUrl,
};
