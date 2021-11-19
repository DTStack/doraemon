const fs = require('fs');
const utils = require('./app/utils');

module.exports = class AppBootHook {
    constructor(app) {
        this.app = app;
    }
    async serverDidReady() {
        const {app} = this;
        app.utils = utils;
        const {cacheDirectory} = app.config;
        if (!fs.existsSync(cacheDirectory)){
            fs.mkdirSync(cacheDirectory);
        }

        // 监听 agent 进程发出的信息并作出反应
        app.messenger.on('sendArticleSubscription', (id) => {
            // create an anonymous context to access service
            const ctx = app.createAnonymousContext()
            ctx.runInBackground(async () => {
                await ctx.service.articleSubscription.sendArticleSubscription(id)
            })
        })
    }
}
