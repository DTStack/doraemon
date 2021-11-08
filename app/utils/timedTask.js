/**
 * 定时任务
 */
const schedule = require('node-schedule')
const _ = require('lodash')
const { getGithubTrending, getJueJinHot } = require('./articleSubscription')

let topicAll = []

// 判断定时任务是否存在
const timedTaskIsExist = (name, app) => {
    const timedTask = schedule.scheduledJobs[`${ name }`]
    log(app, `定时任务：${ name } ${ timedTask === undefined ? '不存在' : '存在' }`)
    return !_.isEmpty(timedTask)
}

// 开始定时任务
const createTimedTask = async (name, cron, app) => {
    if (timedTaskIsExist(name, app)) return
    log(app, `创建定时任务: ${ name }, Cron: ${ cron }`)
    schedule.scheduleJob(`${ name }`, cron, async () => {
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
            log(app, `执行定时任务: ${ name }, 订阅项: ${ siteName }-${ topicName }`)
        }
    })
}

// 改变定时任务的时间规则
const changeTimedTask = (name, cron, app) => {
    if (!timedTaskIsExist(name, app)) return createTimedTask(name, cron, app)
    schedule.rescheduleJob(schedule.scheduledJobs[`${ name }`], cron)
    log(app, `编辑定时任务: ${ name }, Cron: ${ cron }`)
}

// 取消指定定时任务
const cancelTimedTask = (name, app) => {
    if (!timedTaskIsExist(name, app)) return
    log(app, `取消定时任务: ${ name }`)
    schedule.scheduledJobs[`${ name }`].cancel()
}

// 定时任务列表
const timedTaskList = (app) => {
    const result = Object.keys(schedule.scheduledJobs)
    log(app, `定时任务列表: [${ result.join(',') }]`)
    return result
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

// 打印定时任务信息
const log = (app, msg) =>{
    app.logger.info(`${ msg }`)
}

module.exports = {
    createTimedTask,
    changeTimedTask,
    cancelTimedTask,
    timedTaskList,
    startSubscriptionTimedTask
}
