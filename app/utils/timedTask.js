/**
 * 定时任务
 */
const schedule = require('node-schedule')
const moment = require('moment')
const _ = require('lodash')

// 判断定时任务是否存在
const timedTaskIsExist = (name) => {
    return !_.isEmpty(schedule.scheduledJobs[`${ name }`])
}

// 开始定时任务
const createTimedTask = async (name, cron) => {
    !timedTaskIsExist(name) && schedule.scheduleJob(`${ name }`, cron, () => {
        console.log(`${ name } ------- ${ moment().format("YYYY-MM-DD HH:mm:ss") }`)
    })
}

// 取消指定定时任务
const cancelTimedTask = (name) => {
    timedTaskIsExist(name) && schedule.scheduledJobs[`${ name }`].cancel()
}

// 获取打开状态下的订阅列表
const startSubscriptionTimedTask = async (app) => {
    const topicAll = await app.model.ArticleTopic.findAll({
        where: {
            is_delete: 0
        },
        raw: true
    })
    let subscriptionList = await app.model.ArticleSubscription.findAll({
        where: {
            is_delete: 0,
            status: 1
        },
        order: [['created_at', 'DESC']],
        raw: true
    })
    subscriptionList = subscriptionList.map(item => {
        const topicIdList = item.topicIds.split(',')
        let topicList = []
        for (let topic of topicAll) {
            topicIdList.includes(`${ topic.id }`) && topicList.push(topic)
        }
        return {
            ...item,
            topicList
        }
    })

    // console.log(444, subscriptionList)
}

module.exports = {
    createTimedTask,
    cancelTimedTask,
    startSubscriptionTimedTask
}