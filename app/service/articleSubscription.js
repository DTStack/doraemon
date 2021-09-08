const Service = require('egg').Service
const _ = require('lodash')

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
            order: [['updated_at', 'DESC']],
            limit: size,
            offset: size * (current - 1)
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

    // 获取详情
    async getSubscriptionInfo(id) {
        const data = await this.ctx.model.ArticleSubscription.findOne({
            where: { id }
        })
        return data
    }
}

module.exports = ArticleSubscriptionService
