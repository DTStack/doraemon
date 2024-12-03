module.exports = {
    schedule: {
        interval: '0 55 23 ? * 6L', // 每月的最后一个星期五 23:55 触发
        type: 'worker',
        immediate: true,
    },
    async task(ctx) {
        ctx.service.articleSubscription.startSubscriptionTimedTask();
    },
};
