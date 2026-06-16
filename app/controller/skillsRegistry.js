const Controller = require('egg').Controller;

class SkillsRegistryController extends Controller {
    // GET /.well-known/dt-skill.json
    async registryMetadata() {
        const { ctx } = this;
        const data = await ctx.service.skillsRegistry.getRegistryMetadata(ctx.origin);
        ctx.body = data;
    }

    // GET /api/v1/search
    async search() {
        const { ctx } = this;
        const { q, limit } = ctx.query;
        const results = await ctx.service.skillsRegistry.searchSkills(q, limit);
        ctx.body = { results };
    }

    // GET /api/v1/skills
    async list() {
        const { ctx } = this;
        const { cursor, sort, limit } = ctx.query;
        const data = await ctx.service.skillsRegistry.listSkills(cursor, sort, limit);
        ctx.body = data;
    }

    // GET /api/v1/skills/:slug
    async detail() {
        const { ctx } = this;
        const { slug } = ctx.params;
        const data = await ctx.service.skillsRegistry.getSkillDetail(slug);
        if (!data) {
            ctx.status = 404;
            ctx.body = { error: '技能不存在' };
            return;
        }
        ctx.body = data;
    }

    // GET /api/v1/skills/:slug/versions
    async versions() {
        const { ctx } = this;
        const { slug } = ctx.params;
        const data = await ctx.service.skillsRegistry.listSkillVersions(slug);
        if (!data) {
            ctx.status = 404;
            ctx.body = { error: '技能不存在' };
            return;
        }
        ctx.body = data;
    }

    // GET /api/v1/skills/:slug/versions/:version
    async versionDetail() {
        const { ctx } = this;
        const { slug, version } = ctx.params;
        const data = await ctx.service.skillsRegistry.getSkillVersionDetail(slug, version);
        if (!data) {
            ctx.status = 404;
            ctx.body = { error: '版本不存在' };
            return;
        }
        ctx.body = data;
    }

    // GET /api/v1/skills/:slug/file
    async fileContent() {
        const { ctx } = this;
        const { slug } = ctx.params;
        const { path: filePath } = ctx.query;
        const data = await ctx.service.skillsRegistry.getSkillFileContent(slug, filePath);
        if (!data) {
            ctx.status = 404;
            ctx.body = { error: '文件不存在' };
            return;
        }
        ctx.body = data.content;
    }

    // GET /api/v1/download
    async download() {
        const { ctx } = this;
        const { slug } = ctx.query;
        const result = await ctx.service.skillsRegistry.buildSkillZip(slug);
        if (!result) {
            ctx.status = 404;
            ctx.body = { error: '技能不存在' };
            return;
        }
        ctx.set('Content-Type', 'application/zip');
        ctx.set(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(result.fileName)}"`
        );
        ctx.body = result.content;
    }

    // GET /api/v1/resolve
    async resolve() {
        const { ctx } = this;
        const { slug, hash } = ctx.query;
        const data = await ctx.service.skillsRegistry.resolveFingerprint(slug, hash);
        if (!data) {
            ctx.status = 404;
            ctx.body = { error: '未找到匹配的技能' };
            return;
        }
        ctx.body = data;
    }

    // POST /api/v1/skills
    async publish() {
        const { ctx } = this;
        const payload = ctx.request.body || {};
        const files = ctx.request.files
            ? Array.isArray(ctx.request.files)
                ? ctx.request.files
                : [ctx.request.files]
            : [];

        try {
            // If multipart, payload comes as a JSON string field
            let parsedPayload = payload;
            if (payload.payload && typeof payload.payload === 'string') {
                try {
                    parsedPayload = JSON.parse(payload.payload);
                } catch (e) {
                    ctx.throw(400, 'payload 必须是有效的 JSON 字符串');
                }
            }

            const result = await ctx.service.skillsRegistry.publishSkill(parsedPayload, files);
            ctx.body = result;
        } finally {
            try {
                await ctx.cleanupRequestFiles();
            } catch (err) {
                ctx.logger.warn('[skillsRegistry] 清理临时上传文件失败:', err);
            }
        }
    }

    // DELETE /api/v1/skills/:slug
    async delete() {
        const { ctx } = this;
        const { slug } = ctx.params;
        const result = await ctx.service.skillsRegistry.deleteSkill(slug);
        ctx.body = result;
    }

    // POST /api/v1/skills/:slug/undelete
    async undelete() {
        const { ctx } = this;
        const { slug } = ctx.params;
        const result = await ctx.service.skillsRegistry.undeleteSkill(slug);
        ctx.body = result;
    }

    // POST /api/v1/stars/:slug
    async star() {
        const { ctx } = this;
        const { slug } = ctx.params;
        const ip = ctx.service.skillLike.resolveClientIp();
        const data = await ctx.service.skillLike.like(slug, ip);
        ctx.body = {
            starred: data.liked,
            starCount: data.likeCount,
        };
    }

    // DELETE /api/v1/stars/:slug
    async unstar() {
        const { ctx } = this;
        const { slug } = ctx.params;
        const ip = ctx.service.skillLike.resolveClientIp();
        const data = await ctx.service.skillLike.unlike(slug, ip);
        ctx.body = {
            starred: data.liked,
            starCount: data.likeCount,
        };
    }
}

module.exports = SkillsRegistryController;
