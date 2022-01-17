const Service = require('egg').Service
const { getGithubTrendingFromJueJin, getJueJinHot } = require('../utils/articleSubscription')

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

    // 通过订阅 id 查询需要发送的文章订阅消息
    async sendArticleSubscription(id) {
        const topicAll = await this.app.model.ArticleTopic.findAll({ where: { is_delete: 0 }, raw: true })
        const articleSubscription = await this.app.model.ArticleSubscription.findOne({
            where: {
                id,
                is_delete: 0
            },
            raw: true
        })
        const { webHook, groupName } = articleSubscription
        const topicIds = articleSubscription.topicIds.split(',')
        const topicList = topicAll.filter(item => topicIds.includes(`${ item.id }`))

        for (let item of topicList) {
            const { siteName, topicName, topicUrl } = item
            siteName === 'Github' && getGithubTrendingFromJueJin(id, groupName, siteName, topicName, topicUrl, webHook, this.app)
            siteName === '掘金' && getJueJinHot(id, groupName, siteName, topicName, topicUrl, webHook, this.app)
        }
    }

    // 获取打开状态下的订阅列表
    async startSubscriptionTimedTask() {
        const subscriptionList = await this.app.model.ArticleSubscription.findAll({
            where: {
                is_delete: 0,
                status: 1
            },
            order: [['created_at', 'DESC']],
            raw: true
        })
    
        for (let i of subscriptionList) {
            const { id, sendCron } = i
            this.app.messenger.sendToAgent('createTimedTask', { id, sendCron })
        }
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
