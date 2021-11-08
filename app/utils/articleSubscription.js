const cheerio = require('cheerio')
const axios = require('axios')
const { sendArticleMsg } = require('./index')

// github trending
const getGithubTrending = async (topicName, topicUrl, webHook, app) => {
    try {
        const pageSize = app.config.articleSubscription.pageSize
        const { data } = await axios.get(`https://github.com/trending/${ topicUrl }?since=daily`, { timeout: 30_000 })
        let msg = `## Github Trending ${ topicName } 今日 Top5\n\n`

        const $ = cheerio.load(data)
        const items = $('article')
        for (let i = 0; i < pageSize; i++) {
            const result = items.eq(i).find('h1.lh-condensed').text().replace(/\n/g, '').replace(/\s*/g, '')
            msg += `${ i + 1 }、[${ result }](https://github.com/${ result })\n\n`
        }
        msg += `[点击查看更多内容](https://github.com/trending/${ topicUrl }?since=daily)`
        sendArticleMsg('Github Trending 今日 Top5', msg, webHook)
    } catch (err) {
        console.log('Github 网络不佳', err)
        throw new Error('Github 网络不佳')
    }
}

// 掘金热门
const getJueJinHot = async (topicName, topicUrl, webHook, app) => {
    try {
        const pageSize = app.config.articleSubscription.pageSize
        const params = {
            id_type: 2,
            sort_type: 200,
            cate_id: topicUrl,
            cursor: "0",
            limit: pageSize
        }
        const res = await axios.post('https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed', params)
        const { data } = res.data
        let msg = `## 掘金热门 ${ topicName } Top5\n\n`
        for (let i = 0; i < pageSize; i++) {
            msg += `${ i + 1 }、[${ data[i].article_info.title }](https://juejin.cn/post/${ data[i].article_id })\n\n`
        }
        sendArticleMsg('掘金热门 Top5', msg, webHook)
    } catch (err) {
        console.log('掘金请求出错', err)
        throw new Error('掘金请求出错')
    }
}

module.exports = {
    getGithubTrending,
    getJueJinHot
}
