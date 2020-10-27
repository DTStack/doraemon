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
}

module.exports = SwitchHostsService;