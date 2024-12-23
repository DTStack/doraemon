const _ = require('lodash');
const Service = require('egg').Service;

class EnvManagementService extends Service {
    async queryEnvs(params) {
        const { ctx } = this;
        const { tags = '', search = '' } = params;
        const envResult = await ctx.model.EnvManagement.findAll({
            attributes: [
                'id',
                'envName',
                'hostIp',
                'uicUsername',
                'uicPasswd',
                'url',
                'remark',
                'tags',
            ],
            where: {
                status: 1,
                $or: [
                    {
                        envName: { $like: `%${search}%` },
                    },
                    {
                        hostIp: { $like: `%${search}%` },
                    },
                ],
            },
        });
        const tagsResult = await ctx.model.TagManagement.findAll();
        const result = [];
        envResult.forEach((item) => {
            const tagids = item.get('tags').split(',');
            const tagArrs = tagsResult.filter((ele) => {
                return tagids.includes(`${ele.get('id')}`);
            });
            item.set('tags', tagArrs);
            if (tags) {
                if (tags.split(',').some((ele) => tagids.includes(`${ele}`))) {
                    result.push(item);
                }
            } else {
                result.push(item);
            }
        });
        return result;
    }
    addEnv(env) {
        const { ctx } = this;
        return ctx.model.EnvManagement.create(env);
    }
    editEnv(env) {
        const { ctx } = this;
        const { id, envName, hostIp, uicUsername, uicPasswd, url, remark, tags } = env;
        const newEnv = {};
        if (!_.isNil(envName)) newEnv.envName = envName;
        if (!_.isNil(hostIp)) newEnv.hostIp = hostIp;
        if (!_.isNil(uicUsername)) newEnv.uicUsername = uicUsername;
        if (!_.isNil(uicPasswd)) newEnv.uicPasswd = uicPasswd;
        if (!_.isNil(url)) newEnv.url = url;
        if (!_.isNil(remark)) newEnv.remark = remark;
        if (!_.isNil(tags)) newEnv.tags = tags;

        return ctx.model.EnvManagement.update(newEnv, {
            where: {
                id,
            },
        });
    }
    deleteEnv(id) {
        const { ctx } = this;
        return ctx.model.EnvManagement.update(
            {
                status: 0,
            },
            {
                where: {
                    id,
                },
            }
        );
    }
}
module.exports = EnvManagementService;
