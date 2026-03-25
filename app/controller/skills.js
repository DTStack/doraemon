const Controller = require('egg').Controller;
const fs = require('fs');

class SkillsController extends Controller {
    async getSkillList() {
        const { app, ctx } = this;
        const params = ctx.query;
        const data = await ctx.service.skills.querySkillList(params);
        ctx.body = app.utils.response(true, data);
    }

    async getSkillDetail() {
        const { app, ctx } = this;
        const { slug } = ctx.query;
        const data = await ctx.service.skills.getSkillDetail(slug);
        ctx.body = app.utils.response(true, data);
    }

    async getRelatedSkills() {
        const { app, ctx } = this;
        const { slug, limit = 6 } = ctx.query;
        const data = await ctx.service.skills.getRelatedSkills(slug, limit);
        ctx.body = app.utils.response(true, data);
    }

    async getSkillFileContent() {
        const { app, ctx } = this;
        const { slug, path: filePath } = ctx.query;
        const data = await ctx.service.skills.getSkillFileContent(slug, filePath);
        ctx.body = app.utils.response(true, data);
    }

    async downloadSkillArchive() {
        const { ctx } = this;
        const { slug } = ctx.query;
        const { fileName, content } = await ctx.service.skills.getSkillArchive(slug);
        ctx.set('Content-Type', 'application/zip');
        ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        ctx.body = content;
    }

    async getSkillInstallMeta() {
        const { app, ctx } = this;
        const identifier = ctx.query.installKey || ctx.query.slug;
        const data = await ctx.service.skills.getInstallMeta(identifier);
        ctx.body = app.utils.response(true, data);
    }

    async importSkillFile() {
        const { app, ctx } = this;
        const params = ctx.request.body || {};
        const files = ctx.request.files
            ? Array.isArray(ctx.request.files)
                ? ctx.request.files
                : [ctx.request.files]
            : [];
        const file = files[0];

        if (!file) {
            ctx.throw(400, '缺少上传文件');
        }

        try {
            const data = await ctx.service.skills.importSkillFile(params, file);
            ctx.body = app.utils.response(true, data);
        } finally {
            if (file.filepath && fs.existsSync(file.filepath)) {
                try {
                    fs.unlinkSync(file.filepath);
                } catch (error) {
                    ctx.logger.warn(`[skills] 清理上传文件失败: ${error.message}`);
                }
            }
        }
    }

    async updateSkill() {
        const { app, ctx } = this;
        const params = ctx.request.body || {};
        const files = ctx.request.files
            ? Array.isArray(ctx.request.files)
                ? ctx.request.files
                : [ctx.request.files]
            : [];
        const file = files[0] || null;

        try {
            const data = await ctx.service.skills.updateSkill(params, file);
            ctx.body = app.utils.response(true, data, '更新成功');
        } finally {
            if (file?.filepath && fs.existsSync(file.filepath)) {
                try {
                    fs.unlinkSync(file.filepath);
                } catch (error) {
                    ctx.logger.warn(`[skills] 清理更新上传文件失败: ${error.message}`);
                }
            }
        }
    }

    async deleteSkill() {
        const { app, ctx } = this;
        const data = await ctx.service.skills.deleteSkill(ctx.request.body || {});
        ctx.body = app.utils.response(true, data, '删除成功');
    }
}

module.exports = SkillsController;
