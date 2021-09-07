const Controller = require('egg').Controller;

class ArticleSubscriptionTopicController extends Controller {
    // 获取订阅项列表
    async getTopicList() {
        const { ctx, app } = this;
        const data = await ctx.service.articleSubscriptionTopic.getTopicList() || [];
        const nameList = Array.from(new Set(data.map(item => item.siteName)))
        let list = []

        for (let name of nameList) {
            let children = []
            for (let item of data) {
                if (name === item.siteName) {
                    let { id, siteName, topicName, topicUrl } = item
                    children.push({ id, name: `${ siteName } - ${ topicName }`, topicUrl })
                }
            }
            list.push({
                name,
                children
            })
        }
        ctx.body = app.utils.response(true, list);
    }
}

module.exports = ArticleSubscriptionTopicController;
