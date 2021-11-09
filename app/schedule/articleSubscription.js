module.exports = {
    schedule: {
        interval: '0 0 1 ? * SAT',
        type: 'worker',
        immediate: true,
        disable: true // 这个定时任务不会被启动
    },
    async task(ctx) {
        ctx.service.articleSubscription.startSubscriptionTimedTask()
    }
}
