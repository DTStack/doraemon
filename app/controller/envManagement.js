const Controller = require('egg').Controller;
const _ = require('lodash');

class EnvManagementController extends Controller {
    // 环境列表
    async queryEnvs() {
        const { ctx, app } = this;
        const { tags, search } = ctx.request.query;
        const data = await ctx.service.envManagement.queryEnvs({ tags, search });
        ctx.body = app.utils.response(true, data);
    }
    // 新增环境
    async addEnv() {
        const { ctx, app } = this;
        const { envName, hostIp, url, remark, tagIds } = ctx.request.body;
        if (_.isNil(envName)) throw new Error('缺少必要参数 envName');
        if (_.isNil(url)) throw new Error('缺少必要参数 url');
        const result = await ctx.service.envManagement.addEnv({
            envName,
            hostIp,
            url,
            remark,
            tags: tagIds.join(','),
        });
        ctx.body = app.utils.response(
            true,
            result.get({
                plain: true,
            })
        );
    }
    // 编辑环境
    async editEnv() {
        const { ctx, app } = this;
        const { id, envName, hostIp, url, remark, tagIds } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        await ctx.service.envManagement.editEnv({
            id,
            envName,
            hostIp,
            url,
            remark,
            tags: tagIds ? tagIds.join(',') : undefined,
        });
        ctx.body = app.utils.response(true);
    }
    // 删除环境
    async deleteEnv() {
        const { ctx, app } = this;
        const { id } = ctx.request.query;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        await ctx.service.envManagement.deleteEnv(id);
        ctx.body = app.utils.response(true);
    }
}

module.exports = EnvManagementController;
