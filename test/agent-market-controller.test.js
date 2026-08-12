const test = require('node:test');
const assert = require('node:assert/strict');

const AgentsController = require('../app/controller/agents');

function createMockCtx(query = {}, body = {}, files = []) {
    return {
        query,
        request: {
            body,
            files,
        },
        logger: {
            warn() {},
            info() {},
            error() {},
        },
        throw(status, message) {
            const error = new Error(message);
            error.status = status;
            throw error;
        },
        set() {},
        body: null,
        service: {
            agents: {},
        },
    };
}

function buildController(serviceMethods) {
    const controller = Object.create(AgentsController.prototype);
    controller.ctx = createMockCtx();
    controller.app = {
        utils: {
            response(success, data, msg) {
                return { success, data, msg };
            },
        },
    };
    controller.ctx.service.agents = serviceMethods;
    return controller;
}

test('getAgentDetail 返回统一 response 包装', async () => {
    const controller = buildController({
        getAgentDetail: async (name) => {
            assert.equal(name, 'bugfix-agent');
            return { name: 'bugfix-agent' };
        },
    });
    controller.ctx.query = { name: 'bugfix-agent' };

    await controller.getAgentDetail();
    assert.equal(controller.ctx.body.success, true);
    assert.deepEqual(controller.ctx.body.data, { name: 'bugfix-agent' });
});

test('getRelatedAgents 透传 limit 参数', async () => {
    const controller = buildController({
        getRelatedAgents: async (name, limit) => {
            assert.equal(name, 'bugfix-agent');
            assert.equal(limit, '2');
            return [{ name: 'review-agent' }];
        },
    });
    controller.ctx.query = { name: 'bugfix-agent', limit: '2' };

    await controller.getRelatedAgents();
    assert.equal(controller.ctx.body.success, true);
    assert.equal(controller.ctx.body.data.length, 1);
});

test('downloadAgentArchive 返回 ZIP 文件流和下载响应头', async () => {
    const headers = {};
    const stream = { pipe() {} };
    const controller = buildController({
        getAgentArchiveStream: async (name) => {
            assert.equal(name, 'bugfix-agent');
            return {
                stream,
                fileName: 'bugfix-agent.zip',
                mimeType: 'application/zip',
            };
        },
    });
    controller.ctx.query = { name: 'bugfix-agent' };
    controller.ctx.set = (key, value) => {
        headers[key] = value;
    };

    await controller.downloadAgentArchive();

    assert.equal(headers['Content-Type'], 'application/zip');
    assert.equal(headers['Content-Disposition'], 'attachment; filename="bugfix-agent.zip"');
    assert.equal(controller.ctx.body, stream);
});
