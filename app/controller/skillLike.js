const Controller = require('egg').Controller;

class SkillLikeController extends Controller {
    async like() {
        const { app, ctx } = this;
        const { slug } = ctx.request.body || {};
        const ip = ctx.service.skillLike.resolveClientIp();
        const data = await ctx.service.skillLike.like(slug, ip);
        ctx.body = app.utils.response(true, data);
    }

    async unlike() {
        const { app, ctx } = this;
        const { slug } = ctx.request.body || {};
        const ip = ctx.service.skillLike.resolveClientIp();
        const data = await ctx.service.skillLike.unlike(slug, ip);
        ctx.body = app.utils.response(true, data);
    }

    async getLikeStatus() {
        const { app, ctx } = this;
        const { slug } = ctx.query || {};
        const ip = ctx.service.skillLike.resolveClientIp();
        const data = await ctx.service.skillLike.getLikeStatus(slug, ip);
        ctx.body = app.utils.response(true, data);
    }
}

module.exports = SkillLikeController;
