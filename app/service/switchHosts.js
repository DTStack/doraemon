const Service = require('egg').Service;
const _ = require('lodash');

class SwitchHostsService extends Service {
    // 获取列表数据
    getHostsList(reqParams) {
        const { size, current } = reqParams;
        return this.ctx.model.SwitchHosts.findAndCountAll({
            where: {
                is_delete: 0
            },
            limit: size,
            order: [['updated_at', 'DESC']],
            offset: size * (current - 1)
        })
    }

    // 创建
    createHosts(params) {
        const { groupName, groupDesc } = params;
        const hostsParams = {
            groupName,
            groupDesc: groupDesc || '',
            groupApi: '',
            groupId: '',
            groupAddr: '',
            created_at: new Date(),
            updated_at: new Date()
        }
        return this.ctx.model.SwitchHosts.create(hostsParams);
    }

    // 更新
    updateHosts(id, updateParams) {
        const { ctx } = this;
        return ctx.model.SwitchHosts.update(updateParams, {
            where: { id }
        })
    }

    // 获取hosts详细信息
    getHostsInfo(id) {
        const { ctx } = this;
        return ctx.model.SwitchHosts.findOne({
            where: { id }
        });
    }

    // 获取群组存放hosts文件的路径
    async getGroupAddr(id) {
        const data = await this.ctx.model.SwitchHosts.findOne({
            attributes: ['groupAddr'],
            where: { id }
        });
        if (_.isNil(data)) throw new Error('获取不到该群组下存储的hosts文件');
        return data.groupAddr;
    }
}

module.exports = SwitchHostsService;