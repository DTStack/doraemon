/**
 * 文章订阅任务
 */
const schedule = require('node-schedule');

// 判断文章订阅任务是否存在
const timedTaskIsExist = (name, agent) => {
    const timedTask = schedule.scheduledJobs[`${name}`];
    log(agent, `文章订阅任务, id：${name} ${timedTask === undefined ? '不存在' : '存在'}`);
    return timedTask !== undefined;
};

// 开始文章订阅任务
const createTimedTask = (name, cron, agent) => {
    if (timedTaskIsExist(name, agent)) return;
    log(agent, `创建文章订阅任务, id: ${name}, Cron: ${cron}`);
    schedule.scheduleJob(`${name}`, cron, () => {
        // agent 进程随机给一个 app 进程发消息（由 master 来控制发送给谁）
        agent.messenger.sendRandom('sendArticleSubscription', name);
    });
};

// 改变文章订阅任务的时间规则
const changeTimedTask = (name, cron, agent) => {
    if (!timedTaskIsExist(name, agent)) return createTimedTask(name, cron, agent);
    schedule.rescheduleJob(schedule.scheduledJobs[`${name}`], cron);
    log(agent, `编辑文章订阅任务, id: ${name}, Cron: ${cron}`);
};

// 取消指定文章订阅任务
const cancelTimedTask = (name, agent) => {
    if (!timedTaskIsExist(name, agent)) return;
    log(agent, `取消文章订阅任务, id: ${name}`);
    schedule.scheduledJobs[`${name}`].cancel();
};

// 文章订阅任务列表
const timedTaskList = (agent) => {
    const result = Object.keys(schedule.scheduledJobs);
    log(agent, `文章订阅任务 id 列表: [${result.join(',')}]`);
    return result;
};

// 打印文章订阅任务的执行结果
const timedTaskResult = (result, agent) => {
    log(agent, result);
};

// 打印文章订阅任务信息
const log = (agent, msg) => {
    agent.logger.info(`${msg}`);
};

module.exports = {
    createTimedTask,
    changeTimedTask,
    cancelTimedTask,
    timedTaskList,
    timedTaskResult,
};
