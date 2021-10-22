/**
 * RSSHub
 */
const RSSHub = require('rsshub')
const axios = require('axios')
const { sendArticleMsg } = require('./index')

const rssInit = () => {
    RSSHub.init({
        // config
    })
}
rssInit()

// github trending
const getGithubTrending = async (topicName, topicUrl, webHook, app) => {
    try {
        const res = await RSSHub.request(`/github/trending/daily/${ topicUrl }`)
        const { item = [] } = res
        let msg = `## Github Trending ${ topicName } 今日 Top5\n\n`
        for (let i = 0; i < app.config.articleSubscription.pageSize; i++) {
            msg += `${ i + 1 }、[${ item[i].title.replace(' /\n\n      ', '/') }](${ item[i].link })\n\n`
        }
        msg += `[点击查看更多内容](https://github.com/trending/${ topicUrl }?since=daily)`
        sendArticleMsg('Github Trending 今日 Top5', msg, webHook)
        return res
    } catch (err) {
        console.log('RSSHub 出错', err)
        throw new Error('RSSHub 出错')
    }
}

// 掘金热门
const getJueJinHot = async (topicName, topicUrl, webHook, app) => {
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
    return data
}

module.exports = {
    getGithubTrending,
    getJueJinHot
}