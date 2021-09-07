const Service = require('egg').Service

class ArticleSubscriptionTopicService extends Service {
    // 获取订阅项列表
    getTopicList() {
        return this.ctx.model.ArticleSubscriptionTopic.findAll({
            where: {
                is_delete: 0
            },
            order: [['sort']],
            raw: true
        })
    }
}

module.exports = ArticleSubscriptionTopicService
