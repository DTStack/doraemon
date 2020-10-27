const Controller = require('egg').Controller;

class SwitchHostsController extends Controller {
    // 获取列表数据
    async getHostsList() {
        const { app, ctx } = this;
        const { current, size } = ctx.request.body;
        const data = await ctx.service.switchHosts.getHostsList({
            size,
            current
        });
        ctx.body = app.utils.response(true, {
            data: data.rows,
            count: data.count
        });
    }
}

module.exports = SwitchHostsController;