const fs = require('fs');
const utils = require('./app/utils');
const { startSubscriptionTimedTask } = require('./app/utils/timedTask');

module.exports = class AppBootHook {
    constructor(app) {
        this.app = app;
    }
    async serverDidReady() {
        const {app} = this;
        app.utils = utils;
        startSubscriptionTimedTask(app)
        const {cacheDirectory} = app.config;
        if (!fs.existsSync(cacheDirectory)){
            fs.mkdirSync(cacheDirectory);
        }
    }
}
