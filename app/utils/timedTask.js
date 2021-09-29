/**
 * 定时任务
 */
const schedule = require('node-schedule')
const moment = require('moment')
const _ = require('lodash')
const { getGithubTrending, getJueJinHot } = require('./articleSubscription')

let topicAll = []

// 判断定时任务是否存在
const timedTaskIsExist = (name) => {
    return !_.isEmpty(schedule.scheduledJobs[`${ name }`])
}

// 开始定时任务
const createTimedTask = async (name, cron, app) => {
    !timedTaskIsExist(name) && schedule.scheduleJob(`${ name }`, cron, async () => {
        const articleSubscription = await app.model.ArticleSubscription.findOne({
            where: {
                id: name,
                is_delete: 0
            },
            raw: true
        })
        const { webHook } = articleSubscription
        const topicIds = articleSubscription.topicIds.split(',')
        const topicList = topicAll.filter(item => topicIds.includes(`${ item.id }`))

        for (let item of topicList) {
            const { siteName, topicName, topicUrl } = item
            siteName === 'Github' && getGithubTrending(topicName, topicUrl, webHook, app)
            siteName === '掘金' && getJueJinHot(topicName, topicUrl, webHook, app)
            console.log(`${ name }、${ siteName }-${ topicName } -------- ${ moment().format("YYYY-MM-DD HH:mm:ss") }`)
        }
    })
}

// 取消指定定时任务
const cancelTimedTask = (name) => {
    timedTaskIsExist(name) && schedule.scheduledJobs[`${ name }`].cancel()
}

// 获取打开状态下的订阅列表
const startSubscriptionTimedTask = async (app) => {
    topicAll = await getArticleTopicList(app)
    const subscriptionList = await app.model.ArticleSubscription.findAll({
        where: {
            is_delete: 0,
            status: 1
        },
        order: [['created_at', 'DESC']],
        raw: true
    })

    for (let i of subscriptionList) {
        createTimedTask(i.id, i.sendCron, app)
    }
}

// 全量的订阅项
const getArticleTopicList = async (app) => {
    const topicAll = await app.model.ArticleTopic.findAll({
        where: {
            is_delete: 0
        },
        raw: true
    })
    return topicAll
}

module.exports = {
    createTimedTask,
    cancelTimedTask,
    startSubscriptionTimedTask
}
