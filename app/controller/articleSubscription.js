const Controller = require('egg').Controller;
const _ = require('lodash');

class ArticleSubscriptionController extends Controller {
    // 获取列表
    async getSubscriptionList() {
        const { app, ctx } = this;
        const { current, size, searchText } = ctx.request.body;
        if (_.isNil(current)) throw new Error('缺少必要参 current');
        if (_.isNil(size)) throw new Error('缺少必要参数 size');

        const data = await ctx.service.articleSubscription.getSubscriptionList({
            current,
            size,
            searchText,
        });
        ctx.body = app.utils.response(true, {
            data: data.rows.map((item) => {
                return {
                    ...item,
                    topicIds: item.topicIds.split(',').map((i) => +i),
                };
            }),
            count: data.count,
        });
    }

    // 新增
    async createSubscription() {
        const { app, ctx } = this;
        const {
            groupName,
            webHook,
            remark,
            topicIds = [],
            siteNames,
            sendType,
            sendCron,
            time,
            status,
            messageTitle,
            message,
            isAtAll,
        } = ctx.request.body;
        if (_.isNil(groupName)) throw new Error('缺少必要参数 groupName');
        if (_.isNil(webHook)) throw new Error('缺少必要参数 webHook');
        if (_.isNil(siteNames)) throw new Error('缺少必要参数 siteNames');
        if (_.isNil(sendType)) throw new Error('缺少必要参数 sendType');
        if (_.isNil(sendCron)) throw new Error('缺少必要参数 sendCron');
        if (_.isNil(time)) throw new Error('缺少必要参数 time');
        // 数据库插入数据
        const data = await ctx.service.articleSubscription.createSubscription({
            groupName,
            webHook,
            remark,
            topicIds: topicIds?.join(','),
            siteNames,
            sendType,
            sendCron,
            time,
            status,
            messageTitle,
            message,
            isAtAll,
        });
        const { id } = data;
        if (_.isNil(id)) throw new Error('创建失败');
        // 向 agent 进程发消息
        app.messenger.sendToAgent('createTimedTask', { id, sendCron });
        ctx.body = app.utils.response(true, id);
    }

    // 更新
    async updateSubscription() {
        const { ctx, app } = this;
        const {
            id,
            groupName,
            webHook,
            remark,
            topicIds = [],
            siteNames,
            sendType,
            sendCron,
            time,
            status,
            messageTitle,
            message,
            isAtAll,
        } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数 id');
        if (_.isNil(groupName)) throw new Error('缺少必要参数 groupName');
        if (_.isNil(webHook)) throw new Error('缺少必要参数 webHook');
        if (_.isNil(siteNames)) throw new Error('缺少必要参数 siteNames');
        if (_.isNil(sendType)) throw new Error('缺少必要参数 sendType');
        if (_.isNil(sendCron)) throw new Error('缺少必要参数 sendCron');
        await ctx.service.articleSubscription.updateSubscription(id, {
            groupName,
            webHook,
            remark,
            topicIds: topicIds?.join(','),
            siteNames,
            sendType,
            sendCron,
            time,
            status,
            messageTitle,
            message,
            isAtAll,
            updated_at: new Date(),
        });
        // 向 agent 进程发消息
        app.messenger.sendToAgent(status === 1 ? 'changeTimedTask' : 'cancelTimedTask', {
            id,
            sendCron,
        });
        ctx.body = app.utils.response(true, id);
    }

    // 删除
    async deleteSubscription() {
        const { ctx, app } = this;
        const { id } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数 id');
        await ctx.service.articleSubscription.updateSubscription(id, {
            is_delete: 1,
            updated_at: new Date(),
        });
        // 向 agent 进程发消息
        app.messenger.sendToAgent('cancelTimedTask', { id });
        ctx.body = app.utils.response(true, id);
    }

    // 文章订阅任务列表
    async getTimedTaskList() {
        const { ctx, app } = this;
        // 向 agent 进程发消息
        app.messenger.sendToAgent('timedTaskList');
        ctx.body = app.utils.response(true, '请前往服务器 /logs/egg-agent.log 查看');
    }

    // 获取详情
    async getSubscriptionInfo() {
        const { ctx, app } = this;
        const { id } = ctx.query;
        if (_.isNil(id)) throw new Error('缺少必要参数 id');
        const data = await ctx.service.articleSubscription.getSubscriptionInfo(id);
        if (_.isNil(data)) throw new Error('找不到该 id 下的相关信息');
        ctx.body = app.utils.response(true, data);
    }

    // 用于 Postman 调试文章订阅源
    async testArticle() {
        const { ctx, app } = this;
        const { id } = ctx.query;
        const data = await ctx.service.articleSubscription.sendArticleSubscription(id);
        ctx.body = app.utils.response(true, data);
    }
}

module.exports = ArticleSubscriptionController;
