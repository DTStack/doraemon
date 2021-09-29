/**
 * 定时任务
 */
const Controller = require('egg').Controller;
const { sendArticleMsg } = require('../utils')
const { getGithubTrending, getJueJinHot } = require('../utils/articleSubscription')

class ArticleTimedTaskController extends Controller {
    // github 排行榜
    async getGithubTrending() {
        const { app, ctx } = this
        const data = await getGithubTrending()
        const { item = [] } = data
        let msg = '## Github Trending 今日 Top5\n\n'
        for (let i = 0; i < app.config.articleSubscription.pageSize; i++) {
            msg += `${ i + 1 }、[${ item[i].title.replace(' /\n\n      ', '/') }](${ item[i].link })\n\n`
        }
        sendArticleMsg('Github Trending 今日 Top5', msg, 'https://oapi.dingtalk.com/robot/send?access_token=092272565f20f38e450dab4033ac2939d90a27c03773cf2c6c6cd2dad78ee96f')
        ctx.body = app.utils.response(true, data)
    }

    // 掘金热榜
    async getJueJinHot() {
        const { app, ctx } = this
        const data = await getJueJinHot()
        let msg = '## 掘金热榜 Top5\n\n'
        for (let i = 0; i < app.config.articleSubscription.pageSize; i++) {
            msg += `${ i + 1 }、[${ data[i].article_info.title }](${ data[i].article_info.link_url })\n\n`
        }
        sendArticleMsg('掘金热榜 Top5', msg, 'https://oapi.dingtalk.com/robot/send?access_token=092272565f20f38e450dab4033ac2939d90a27c03773cf2c6c6cd2dad78ee96f')
        ctx.body = app.utils.response(true, data)
    }
}

module.exports = ArticleTimedTaskController;
