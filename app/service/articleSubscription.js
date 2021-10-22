const Service = require('egg').Service

class ArticleSubscriptionService extends Service {
    // 获取列表
    getSubscriptionList(reqParams) {
        const { size, current, searchText } = reqParams
        return this.ctx.model.ArticleSubscription.findAndCountAll({
            where: {
                groupName: {
                    '$like':`%${ searchText }%`
                },
                is_delete: 0
            },
            order: [['created_at', 'DESC']],
            limit: size,
            offset: size * (current - 1),
            raw: true
        })
    }

    // 新增
    createSubscription(params) {
        return this.ctx.model.ArticleSubscription.create(params)
    }

    // 更新
    updateSubscription(id, updateParams) {
        return this.ctx.model.ArticleSubscription.update(updateParams, {
            where: { id }
        })
    }

    // 获取详情 - 暂未使用
    async getSubscriptionInfo(id) {
        const data = await this.ctx.model.ArticleSubscription.findOne({
            where: { id }
        })
        return data
    }
}

module.exports = ArticleSubscriptionService