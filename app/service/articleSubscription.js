const Service = require('egg').Service;
const { SITE_NAME, TOPIC_NAME } = require('../consts');
const {
    getGithubTrendingFromServerless,
    getJueJinHot,
    getDevArchitectureHot,
    getReactStatusHot,
    customMessage,
} = require('../utils/articleSubscription');

class ArticleSubscriptionService extends Service {
    // 获取列表
    getSubscriptionList(reqParams) {
        const { size, current, searchText } = reqParams;
        return this.ctx.model.ArticleSubscription.findAndCountAll({
            where: {
                groupName: {
                    $like: `%${searchText}%`,
                },
                is_delete: 0,
            },
            order: [['created_at', 'DESC']],
            limit: size,
            offset: size * (current - 1),
            raw: true,
        });
    }

    // 新增
    createSubscription(params) {
        return this.ctx.model.ArticleSubscription.create(params);
    }

    // 更新
    updateSubscription(id, updateParams) {
        return this.ctx.model.ArticleSubscription.update(updateParams, {
            where: { id },
        });
    }

    // 通过订阅 id 查询需要发送的文章订阅消息
    async sendArticleSubscription(id) {
        const articleSubscription = await this.app.model.ArticleSubscription.findOne({
            where: {
                id,
                is_delete: 0,
            },
            raw: true,
        });
        const { webHook, groupName, siteNames, messageTitle, message, isAtAll } =
            articleSubscription;
        if (siteNames === '自定义消息') {
            customMessage(
                id,
                groupName,
                siteNames,
                messageTitle,
                message,
                isAtAll,
                webHook,
                this.app
            );
        } else {
            const topicAll = await this.app.model.ArticleTopic.findAll({
                where: { is_delete: 0 },
                raw: true,
            });
            const topicIds = articleSubscription.topicIds?.split(',') || [];
            const topicList = topicAll.filter((item) => topicIds.includes(`${item.id}`));

            for (const item of topicList) {
                const { siteName, topicName, topicUrl } = item;
                siteName === SITE_NAME.GITHUB &&
                    getGithubTrendingFromServerless(
                        id,
                        groupName,
                        siteName,
                        topicName,
                        topicUrl,
                        webHook,
                        this.app
                    );
                siteName === SITE_NAME.JUEJIN &&
                    getJueJinHot(id, groupName, siteName, topicName, topicUrl, webHook, this.app);
                topicName === TOPIC_NAME.DEV_ARCHITECTURE &&
                    getDevArchitectureHot(
                        id,
                        groupName,
                        siteName,
                        topicName,
                        topicUrl,
                        webHook,
                        this.app
                    );
                topicName === TOPIC_NAME.REACT_STATUS &&
                    getReactStatusHot(
                        id,
                        groupName,
                        siteName,
                        topicName,
                        topicUrl,
                        webHook,
                        this.app
                    );
            }
        }
    }

    // 获取打开状态下的订阅列表
    async startSubscriptionTimedTask() {
        const subscriptionList = await this.app.model.ArticleSubscription.findAll({
            where: {
                is_delete: 0,
                status: 1,
            },
            order: [['created_at', 'DESC']],
            raw: true,
        });

        for (const i of subscriptionList) {
            const { id, sendCron } = i;
            this.app.messenger.sendToAgent('createTimedTask', { id, sendCron });
        }
    }

    // 获取详情 - 暂未使用
    async getSubscriptionInfo(id) {
        const data = await this.ctx.model.ArticleSubscription.findOne({
            where: { id },
        });
        return data;
    }
}

module.exports = ArticleSubscriptionService;
