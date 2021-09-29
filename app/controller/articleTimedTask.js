/**
 * 定时任务
 */
const Controller = require('egg').Controller;
const { getGithubTrending, getJueJinHot } = require('../utils/articleSubscription')

class ArticleTimedTaskController extends Controller {
    // github 排行榜
    async getGithubTrending() {
        const { app, ctx } = this
        const { topicName, topicUrl, webHook } = await app.model.ArticleSubscription.findOne({
            where: {
                id: ctx.request.query.id,
                is_delete: 0
            },
            raw: true
        })
        const data = await getGithubTrending(topicName, topicUrl, webHook, app)
        ctx.body = app.utils.response(true, data)
    }

    // 掘金热门
    async getJueJinHot() {
        const { app, ctx } = this
        const { topicName, topicUrl, webHook } = await app.model.ArticleSubscription.findOne({
            where: {
                id: ctx.request.query.id,
                is_delete: 0
            },
            raw: true
        })
        const data = await getJueJinHot(topicName, topicUrl, webHook, app)
        ctx.body = app.utils.response(true, data)
    }
}

module.exports = ArticleTimedTaskController;
