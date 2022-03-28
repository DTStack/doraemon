const { createTimedTask, changeTimedTask, cancelTimedTask, timedTaskList, timedTaskResult } = require('./app/utils/timedTask')

// 接收 app 发送来的消息并作出反应
module.exports = agent => {
    // 创建文章订阅任务
    agent.messenger.on('createTimedTask', ({ id, sendCron }) => {
        createTimedTask(id, sendCron, agent)
    })

    // 改变文章订阅任务
    agent.messenger.on('changeTimedTask', ({ id, sendCron }) => {
        changeTimedTask(id, sendCron, agent)
    })

    // 取消文章订阅任务
    agent.messenger.on('cancelTimedTask', ({ id }) => {
        cancelTimedTask(id, agent)
    })

    // 文章订阅任务列表
    agent.messenger.on('timedTaskList', () => {
        timedTaskList(agent)
    })

    // 打印文章订阅任务的执行结果
    agent.messenger.on('timedTaskResult', ({ result }) => {
        timedTaskResult(result, agent)
    })
}
