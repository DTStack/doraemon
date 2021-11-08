const { startSubscriptionTimedTask } = require('../utils/timedTask');

module.exports = {
    schedule: {
        interval: '0 0 1 ? * SAT',
        type: 'worker',
        immediate: true
    },
    async task(ctx) {
        await startSubscriptionTimedTask(ctx.app)
    }
}
