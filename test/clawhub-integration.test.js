const test = require('node:test');
const assert = require('node:assert/strict');

/**
 * Integration tests for clawhub API endpoints.
 *
 * These tests verify the controller + service integration with mocked
 * Egg.js context. Full end-to-end tests requiring a running dev server
 * and the clawhub CLI should be run manually per quickstart.md.
 */

// Load controller and create mock ctx
const ClawhubController = require('../app/controller/clawhub');

function createMockCtx(query = {}, params = {}, body = {}, files = []) {
    const ctx = {
        origin: 'http://10.0.0.8:7001',
        query,
        params,
        request: { body, files, headers: {} },
        throw(status, message) {
            const err = new Error(message);
            err.status = status;
            throw err;
        },
        logger: { warn: () => {}, info: () => {}, error: () => {} },
        set: () => {},
        status: 200,
        body: null,
    };
    return ctx;
}

// Helper to build a controller with mocked service
function buildController(serviceMethods) {
    const controller = Object.create(ClawhubController.prototype);
    const skillLikeService = Object.create(require('../app/service/skillLike').prototype);
    skillLikeService.resolveClientIp = () => '127.0.0.1';
    skillLikeService.like = async () => ({ liked: true, likeCount: 1 });
    skillLikeService.unlike = async () => ({ liked: false, likeCount: 0 });

    controller.ctx = createMockCtx();
    controller.ctx.service = {
        clawhub: serviceMethods,
        skillLike: skillLikeService,
    };
    return controller;
}

test('registryMetadata endpoint returns flat JSON', async () => {
    const controller = buildController({
        getRegistryMetadata: async (origin) => ({
            apiBase: origin,
            authBase: null,
            minCliVersion: '0.9.0',
        }),
    });

    await controller.registryMetadata();
    assert.equal(controller.ctx.body.apiBase, 'http://10.0.0.8:7001');
    assert.equal(controller.ctx.body.authBase, null);
});

test('search endpoint passes query and limit to service', async () => {
    const controller = buildController({
        searchSkills: async (q, limit) => {
            assert.equal(q, 'react');
            assert.equal(limit, '10');
            return [{ slug: 'react-skill', displayName: 'React', version: '1.0.0', score: 1.0 }];
        },
    });
    controller.ctx.query = { q: 'react', limit: '10' };

    await controller.search();
    assert.equal(controller.ctx.body.results.length, 1);
    assert.equal(controller.ctx.body.results[0].slug, 'react-skill');
});

test('detail endpoint returns 404 for missing skill', async () => {
    const controller = buildController({
        getSkillDetail: async () => null,
    });
    controller.ctx.params = { slug: 'missing' };

    await controller.detail();
    assert.equal(controller.ctx.status, 404);
    assert.equal(controller.ctx.body.error, '技能不存在');
});

test('download endpoint sets correct headers', async () => {
    const controller = buildController({
        buildSkillZip: async (slug) => {
            assert.equal(slug, 'my-skill');
            return { fileName: 'my-skill-1.0.0.zip', content: Buffer.from('PK') };
        },
    });
    controller.ctx.query = { slug: 'my-skill', version: '1.0.0' };
    const headers = {};
    controller.ctx.set = (k, v) => {
        headers[k] = v;
    };

    await controller.download();
    assert.equal(headers['Content-Type'], 'application/zip');
    assert.ok(headers['Content-Disposition'].includes('my-skill-1.0.0.zip'));
    assert.ok(Buffer.isBuffer(controller.ctx.body));
});

test('publish endpoint parses multipart payload JSON string', async () => {
    const controller = buildController({
        publishSkill: async (payload, files) => {
            assert.equal(payload.slug, 'test-skill');
            assert.equal(files.length, 1);
            return { ok: true, skillId: 123, versionId: 'v1.0.0' };
        },
    });
    controller.ctx.request.body = {
        payload: JSON.stringify({ slug: 'test-skill', displayName: 'Test', version: '1.0.0' }),
    };
    controller.ctx.request.files = [{ filepath: 'SKILL.md', content: '# Test' }];

    await controller.publish();
    assert.equal(controller.ctx.body.ok, true);
});

test('resolve endpoint returns correct match and latestVersion response', async () => {
    const controller = buildController({
        resolveFingerprint: async (slug, hash) => {
            assert.equal(slug, 'my-skill');
            assert.equal(hash, 'abc123');
            return {
                match: { version: '1.0.0' },
                latestVersion: { version: '1.0.0' },
            };
        },
    });
    controller.ctx.query = { slug: 'my-skill', hash: 'abc123' };

    await controller.resolve();
    assert.equal(controller.ctx.status, 200);
    assert.deepEqual(controller.ctx.body, {
        match: { version: '1.0.0' },
        latestVersion: { version: '1.0.0' },
    });
});

test('star endpoint delegates to skillLike service', async () => {
    const controller = buildController({});
    controller.ctx.params = { slug: 'my-skill' };
    controller.ctx.service.skillLike = {
        resolveClientIp: () => '127.0.0.1',
        like: async (slug, _ip) => {
            assert.equal(slug, 'my-skill');
            return { liked: true, likeCount: 5 };
        },
    };

    await controller.star();
    assert.equal(controller.ctx.body.starred, true);
    assert.equal(controller.ctx.body.starCount, 5);
});

test('unstar endpoint delegates to skillLike service', async () => {
    const controller = buildController({});
    controller.ctx.params = { slug: 'my-skill' };
    controller.ctx.service.skillLike = {
        resolveClientIp: () => '127.0.0.1',
        unlike: async (slug, _ip) => {
            assert.equal(slug, 'my-skill');
            return { liked: false, likeCount: 4 };
        },
    };

    await controller.unstar();
    assert.equal(controller.ctx.body.starred, false);
    assert.equal(controller.ctx.body.starCount, 4);
});
