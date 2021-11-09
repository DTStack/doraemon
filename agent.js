const { createTimedTask, changeTimedTask, cancelTimedTask, timedTaskList } = require('./app/utils/timedTask')

// 接收 app 发送来的消息并作出反应
module.exports = agent => {
    // 创建定时任务
    agent.messenger.on('createTimedTask', ({ id, sendCron }) => {
        createTimedTask(id, sendCron, agent)
    })

    // 改变定时任务
    agent.messenger.on('changeTimedTask', ({ id, sendCron }) => {
        changeTimedTask(id, sendCron, agent)
    })

    // 取消定时任务
    agent.messenger.on('cancelTimedTask', ({ id }) => {
        cancelTimedTask(id, agent)
    })

    // 定时任务列表
    agent.messenger.on('timedTaskList', () => {
        timedTaskList(agent)
    })
}
