const Service = require('egg').Service;

class ArticleTopicService extends Service {
    // 获取订阅项列表
    getTopicList() {
        return this.ctx.model.ArticleTopic.findAll({
            where: {
                is_delete: 0,
            },
            order: [['sort']],
            raw: true,
        });
    }
}

module.exports = ArticleTopicService;
