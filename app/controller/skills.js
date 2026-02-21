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
}

module.exports = SkillsController;
