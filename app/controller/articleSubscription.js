const Controller = require('egg').Controller;
const _ = require('lodash');
const { createTimedTask, changeTimedTask, cancelTimedTask, timedTaskList } = require('../utils/timedTask')

class ArticleSubscriptionController extends Controller {
    // 获取列表
    async getSubscriptionList() {
        const { app, ctx } = this;
        const { current, size, searchText } = ctx.request.body;
        if (_.isNil(current)) throw new Error('缺少必要参 current');
        if (_.isNil(size)) throw new Error('缺少必要参数 size');

        const data = await ctx.service.articleSubscription.getSubscriptionList({ current, size, searchText });
        ctx.body = app.utils.response(true, {
            data: data.rows.map(item => {
                return {
                    ...item,
                    topicIds: item.topicIds.split(',').map(i => +i)
                }
            }),
            count: data.count
        });
    }

    // 新增
    async createSubscription() {
        const { app, ctx } = this;
        const { groupName, webHook, remark, topicIds, siteNames, sendType, sendCron, time, status } = ctx.request.body;
        if (_.isNil(groupName)) throw new Error('缺少必要参数 groupName');
        if (_.isNil(webHook)) throw new Error('缺少必要参数 webHook');
        if (_.isNil(topicIds)) throw new Error('缺少必要参数 topicIds');
        if (_.isNil(siteNames)) throw new Error('缺少必要参数 siteNames');
        if (_.isNil(sendType)) throw new Error('缺少必要参数 sendType');
        if (_.isNil(sendCron)) throw new Error('缺少必要参数 sendCron');
        if (_.isNil(time)) throw new Error('缺少必要参数 time');
        // 数据库插入数据
        const data = await ctx.service.articleSubscription.createSubscription({ groupName, webHook, remark, topicIds: topicIds.join(','), siteNames, sendType, sendCron, time, status });
        const { id } = data
        if (_.isNil(id)) throw new Error('创建失败');
        createTimedTask(id, sendCron, app)
        ctx.body = app.utils.response(true, id);
    }

    // 更新
    async updateSubscription() {
        const { ctx, app } = this;
        const { id, groupName, webHook, remark, topicIds, siteNames, sendType, sendCron, time, status } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数 id');
        if (_.isNil(groupName)) throw new Error('缺少必要参数 groupName');
        if (_.isNil(webHook)) throw new Error('缺少必要参数 webHook');
        if (_.isNil(topicIds)) throw new Error('缺少必要参数 topicIds');
        if (_.isNil(siteNames)) throw new Error('缺少必要参数 siteNames');
        if (_.isNil(sendType)) throw new Error('缺少必要参数 sendType');
        if (_.isNil(sendCron)) throw new Error('缺少必要参数 sendCron');
        await ctx.service.articleSubscription.updateSubscription(id, { groupName, webHook, remark, topicIds: topicIds.join(','), siteNames, sendType, sendCron, time, status, updated_at: new Date() })
        status === 1 ? changeTimedTask(id, sendCron, app) : cancelTimedTask(id)
        ctx.body = app.utils.response(true, id);
    }

    // 删除
    async deleteSubscription() {
        const { ctx, app } = this;
        const { id } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数 id');
        await ctx.service.articleSubscription.updateSubscription(id, { is_delete: 1, updated_at: new Date() });
        cancelTimedTask(id)
        ctx.body = app.utils.response(true, id);
    }

    // 定时任务列表
    async getTimedTaskList() {
        const { ctx, app } = this;
        ctx.body = app.utils.response(true, timedTaskList());
    }

    // 获取详情
    async getSubscriptionInfo() {
        const { ctx, app } = this;
        const { id } = ctx.query;
        if (_.isNil(id)) throw new Error('缺少必要参数 id')
        const data = await ctx.service.articleSubscription.getSubscriptionInfo(id);
        if (_.isNil(data)) throw new Error('找不到该 id 下的相关信息');
        ctx.body = app.utils.response(true, data);
    }
}

module.exports = ArticleSubscriptionController;
