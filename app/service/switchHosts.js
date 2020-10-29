const Service = require('egg').Service;

class SwitchHostsService extends Service {
    // 获取列表数据
    getHostsList({
        size,
        current
    }) {
        const { ctx } = this;
        return ctx.model.SwitchHosts.findAndCountAll({
            // attributes: ['id', 'groupId'],
            limit: size,
            order: [['updated_at', 'DESC']],
            offset: size * (current - 1)
        })
    }

    // 创建
    createHosts(hostsParams) {
        const { ctx } = this;
        return ctx.model.SwitchHosts.create(hostsParams);
    }

    // 更新
    updateHosts(updateParams) {
        const { ctx } = this;
        const { groupName, groupDesc, id } = updateParams;
        return ctx.model.SwitchHosts.update({
            groupName,
            groupDesc,
            updated_at: new Date()
        }, {
            where: { id }
        })
    }

    // 获取hosts详细信息
    getHostsInfo({ id }) {
        const { ctx } = this;
        return ctx.model.SwitchHosts.findOne({
            where: { id }
        });
    }
}

module.exports = SwitchHostsService;