const Controller = require('egg').Controller;
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

class ArticleSubscriptionController extends Controller {
    // 获取列表
    async getSubscriptionList() {
        const { app, ctx } = this;
        const { current, size, searchText } = ctx.request.body;
        if (_.isNil(current)) throw new Error('缺少必要参 current');
        if (_.isNil(size)) throw new Error('缺少必要参数 size');
        const data = await ctx.service.articleSubscription.getSubscriptionList({ current, size, searchText });
        ctx.body = app.utils.response(true, {
            data: data.rows,
            count: data.count
        });
    }

    // 新增
    async createSubscription() {
        const { app, ctx } = this;
        const { groupName, webHook, remark, topicIds, sendType, sendCron, status } = ctx.request.body;
        if (_.isNil(groupName)) throw new Error('缺少必要参数 groupName');
        if (_.isNil(webHook)) throw new Error('缺少必要参数 webHook');
        if (_.isNil(topicIds)) throw new Error('缺少必要参数 topicIds');
        if (_.isNil(sendType)) throw new Error('缺少必要参数 sendType');
        if (_.isNil(sendCron)) throw new Error('缺少必要参数 sendCron');
        // 数据库插入数据
        const data = await ctx.service.articleSubscription.createSubscription({ groupName, webHook, remark, topicIds, sendType, sendCron, status });
        if (_.isNil(data)) throw new Error('创建失败');
        ctx.body = app.utils.response(true, data);
    }

    // 更新
    async updateSubscription() {
        const { ctx, app } = this;
        const { id, groupName, webHook, remark, topicIds, sendType, sendCron, status } = ctx.request.body;
        const { origin, referer } = ctx.request.header;
        if (_.isNil(id)) throw new Error('缺少必要参数 id');
        if (_.isNil(groupName)) throw new Error('缺少必要参数 groupName');
        if (_.isNil(webHook)) throw new Error('缺少必要参数 webHook');
        if (_.isNil(topicIds)) throw new Error('缺少必要参数 topicIds');
        if (_.isNil(sendType)) throw new Error('缺少必要参数 sendType');
        if (_.isNil(sendCron)) throw new Error('缺少必要参数 sendCron');

        const result = await ctx.service.articleSubscription.updateSubscription(id, { groupName, webHook, remark, topicIds, sendType, sendCron, status, updated_at: new Date() })
        ctx.body = app.utils.response(result);
    }

    // 删除
    async deleteSubscription() {
        const { ctx, app } = this;
        const { id } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数 id');
        const result = await ctx.service.articleSubscription.deleteSubscription(id, { is_delete: 1, updated_at: new Date() });
        ctx.body = app.utils.response(result);
    }

    // 获取单条数据
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
