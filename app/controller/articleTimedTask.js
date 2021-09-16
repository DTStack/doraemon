/**
 * 定时任务
 */
const Controller = require('egg').Controller;
const { getGithubTrending } = require('../utils/rsshub')

class ArticleTimedTaskController extends Controller {
    // github trending
    async getGithubTrending() {
        const { app, ctx } = this
        const data = await getGithubTrending()
        ctx.body = app.utils.response(true, data)
    }
}

module.exports = ArticleTimedTaskController;
