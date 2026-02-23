const Controller = require('egg').Controller;

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

    async importSkill() {
        const { app, ctx } = this;
        const params = ctx.request.body || {};
        const data = await ctx.service.skills.importSkill(params);
        ctx.body = app.utils.response(true, data);
    }
}

module.exports = SkillsController;
