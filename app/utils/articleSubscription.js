/**
 * 文章订阅
 * 功能说明文档：https://dtstack.yuque.com/rd-center/sm6war/tyz0bp
 */
const cheerio = require('cheerio')
const axios = require('axios')
const config = require('../../env.json')
const { sendArticleMsg, sendMsgAfterSendArticle } = require('./index')
const articleResultWebhook = config.articleResultWebhook // 文章订阅结果通知机器人
const timeout = 30_000

// github trending from github
const getGithubTrendingFromGithub = async (id, groupName, siteName, topicName, topicUrl, webHook, app) => {
    try {
        const pageSize = app.config.articleSubscription.pageSize
        const { data } = await axios.get(`https://github.com/trending/${ topicUrl }?since=daily`, { timeout })
        let msg = `## Github Trending ${ topicName } 今日 Top5\n\n`

        const $ = cheerio.load(data)
        const items = $('article')
        for (let i = 0; i < pageSize; i++) {
            const result = items.eq(i).find('h1.lh-condensed').text().replace(/\n/g, '').replace(/\s*/g, '')
            msg += `${ i + 1 }、[${ result }](https://github.com/${ result })\n\n`
        }
        msg += `[点击查看更多内容](https://github.com/trending/${ topicUrl }?since=daily)`
        sendArticleMsg('Github Trending 今日 Top5', msg, webHook)
        logFunc(app, id, groupName, siteName, topicName, '成功')
    } catch (err) {
        logFunc(app, id, groupName, siteName, topicName, `失败`, `Github 网络不佳 ${ JSON.stringify(err) }`)
    }
}

// github trending from 掘金 chrome 插件
const getGithubTrendingFromJueJin = async (id, groupName, siteName, topicName, topicUrl, webHook, app) => {
    try {
        const pageSize = app.config.articleSubscription.pageSize
        const params = {
            category: 'trending',
            period: 'day',
            lang: topicUrl,
            offset: 0,
            limit: pageSize
        }
        const res = await axios.post(`https://e.juejin.cn/resources/github`, params)
        const { data } = res.data
        let msg = `## Github Trending ${ topicName } 今日 Top5\n\n`

        for (let i = 0; i < pageSize; i++) {
            msg += `${ i + 1 }、[${ data[i].username } / ${ data[i].reponame }](${ data[i].url })\n\n`
        }
        msg += `[点击查看更多内容](https://github.com/trending/${ topicUrl }?since=daily)`
        sendArticleMsg('Github Trending 今日 Top5', msg, webHook)
        logFunc(app, id, groupName, siteName, topicName, '成功')
    } catch (err) {
        logFunc(app, id, groupName, siteName, topicName, `失败`, `Github 网络不佳 ${ JSON.stringify(err) }`)
    }
}

// github trending from Serverless，目前使用的是该方法
const getGithubTrendingFromServerless = async (id, groupName, siteName, topicName, topicUrl, webHook, app) => {
    try {
        const pageSize = app.config.articleSubscription.pageSize
        const res = await axios.get(`http://github-trending-api.liuxianyu.cn/repository/list?language=${ topicUrl }&pageSize=${ pageSize }`, { timeout })
        const { data } = res.data
        let msg = `## Github Trending ${ topicName } 今日 Top5\n\n`

        for (let i = 0; i < pageSize; i++) {
            msg += `${ i + 1 }、[${ data.list[i].username } / ${ data.list[i].repositoryName }](${ data.list[i].url })\n\n`
        }
        msg += `[点击查看更多](https://github.com/trending/${ topicUrl }?since=daily)`
        sendArticleMsg('Github Trending 今日 Top5', msg, webHook)
        logFunc(app, id, groupName, siteName, topicName, '成功')
    } catch (err) {
        logFunc(app, id, groupName, siteName, topicName, `失败`, `Github 网络不佳 ${ JSON.stringify(err) }`)
    }
}

// 掘金热门 https://juejin.cn/frontend
const getJueJinHot = async (id, groupName, siteName, topicName, topicUrl, webHook, app) => {
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
        logFunc(app, id, groupName, siteName, topicName, '成功')
    } catch (err) {
        logFunc(app, id, groupName, siteName, topicName, `失败`, `${ JSON.stringify(err) }`)
    }
}

// https://dev.to/t/architecture/top/week
const getDevArchitectureHot = async (id, groupName, siteName, topicName, topicUrl, webHook, app) => {
    try {
        const pageSize = app.config.articleSubscription.pageSize
        const res = await axios.get(`https://dev.to/search/feed_content?per_page=5&page=0&tag=architecture&sort_by=public_reactions_count&sort_direction=desc&tag_names%5B%5D=architecture&approved=&class_name=Article&published_at%5Bgte%5D=2024-11-10T02%3A43%3A45Z`, { timeout })
        let msg = `## DEV Architecture 每周 Top5\n\n`

        const data = res?.data?.result || []
        for (let i = 0; i < pageSize; i++) {
            msg += `${ i + 1 }、[${ data[i].title }](https://dev.to${ data[i].path })\n\n`
        }
        msg += `[点击查看更多内容](https://dev.to/t/architecture/top/week)`
        sendArticleMsg('DEV Architecture 每周 Top5', msg, webHook)
        logFunc(app, id, groupName, siteName, topicName, '成功')
    } catch (err) {
        logFunc(app, id, groupName, siteName, topicName, `失败`, `${ JSON.stringify(err) }`)
    }
}

// https://react.statuscode.com/latest
const getReactStatusHot = async (id, groupName, siteName, topicName, topicUrl, webHook, app) => {
    try {
        const pageSize = app.config.articleSubscription.pageSize
        const { data } = await axios.get(`https://react.statuscode.com/latest`, { timeout })
        let msg = `## React Status\n\n`

        const $ = cheerio.load(data)
        const items = $('table.el-item').find('span.mainlink')
        for (let i = 0; i < pageSize; i++) {
            const name = items.eq(i).text()
            const url = items.eq(i).find('a').attr('href')
            msg += `${ i + 1 }、[${ name }](${ url })\n\n`
        }
        msg += `[点击查看更多内容](https://react.statuscode.com/latest)`
        sendArticleMsg('React Status', msg, webHook)
        logFunc(app, id, groupName, siteName, topicName, '成功')
    } catch (err) {
        logFunc(app, id, groupName, siteName, topicName, `失败`, `Github 网络不佳 ${ JSON.stringify(err) }`)
    }
}

// 自定义消息
const customMessage = async (id, groupName, siteName, messageTitle, message, isAtAll, webHook, app) => {
    try {
        sendArticleMsg(messageTitle, message?.replace(/\\n/g, '\n')?.replace(/\\r/g, '\r'), webHook, { isAtAll })
        logFunc(app, id, groupName, siteName, messageTitle, '成功')
    } catch (err) {
        logFunc(app, id, groupName, siteName, messageTitle, `失败`, `${ JSON.stringify(err) }`)
    }
}

// 打印文章订阅任务结果
const logFunc = (app, id, groupName, siteName, topicName, msg, errMsg = '') => {
    if (!articleResultWebhook) return
    const result = `文章订阅任务, id: ${ id } 执行${ msg }, 钉钉群名称: ${ groupName }, 订阅项: ${ siteName }-${ topicName } ${ errMsg ? ', ' + errMsg : '' }`
    // 向 agent 进程发消息
    app.messenger.sendToAgent('timedTaskResult', { result })

    // 文章订阅发送后，发出是否成功的通知
    const text = `文章订阅结果：<font color=${ msg === '失败' ? '#ff0000' : '#007500'}>${ msg }</font>
        \n\n钉钉群名称：${ groupName }
        \n\n订阅项：${ siteName }-${ topicName }
        ${ msg === '失败' ? '\n\n请前往服务器查看对应日志！' : '' }`
    sendMsgAfterSendArticle(`发送${ msg }`, text, articleResultWebhook)
}

module.exports = {
    getGithubTrendingFromGithub,
    getGithubTrendingFromJueJin,
    getGithubTrendingFromServerless,
    getJueJinHot,
    getDevArchitectureHot,
    getReactStatusHot,
    customMessage
}
