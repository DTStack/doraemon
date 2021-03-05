const Controller = require('egg').Controller;
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
// const { createWS } = require('../utils/ws');

class SwitchHostsController extends Controller {
    // 获取列表数据
    async getHostsList() {
        const { app, ctx } = this;
        const { current, size, searchText } = ctx.request.body;
        if (_.isNil(current)) throw new Error('缺少必要参current');
        if (_.isNil(size)) throw new Error('缺少必要参数size');
        const data = await ctx.service.switchHosts.getHostsList({
            size,
            current,
            searchText
        });
        ctx.body = app.utils.response(true, {
            data: data.rows,
            count: data.count
        });
    }

    // 创建hosts分组
    async createHosts() {
        const { app, ctx } = this;
        const { groupName, groupDesc, is_push, hosts = '' } = ctx.request.body;
        if (_.isNil(groupName)) throw new Error('缺少必要参数groupName');
        // 数据库插入数据
        const data = await ctx.service.switchHosts.createHosts({
            groupName,
            groupDesc,
            is_push
        });
        if (_.isNil(data)) throw new Error('创建失败');
        // 创建对应hosts文件
        const fileName = 'hosts_' + data.id;
        const paths = ['resources', 'hosts'];
        const filePath = app.utils.createFileSync(paths,fileName,hosts);
        // 创建websocket连接
        // createWS(8080, '/websocket_' + data.id);
        // 更新数据
        const groupApi = `/api/switch-hosts/connect/${data.id}`;
        const result = await ctx.service.switchHosts.updateHosts(data.id, {
            groupApi,
            // groupId,
            groupAddr:filePath
        });
        data.dataValues.groupAddr = filePath;
        data.dataValues.groupApi = groupApi;
        ctx.body = app.utils.response(result, data);
    }

    // 更新hosts分组
    async updateHosts() {
        const { ctx, app } = this;
        const { hosts, id, groupName, groupDesc, is_push } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        if (_.isNil(groupName)) throw new Error('缺少必要参数groupName');
        // 更新hosts
        const groupAddr = await ctx.service.switchHosts.getGroupAddr(id);
        try {
            fs.writeFileSync(groupAddr, hosts);
        } catch (error) {
            throw new Error('更新文件失败');
        }
        // 更新参数
        const result = await ctx.service.switchHosts.updateHosts(id, {
            groupName,
            groupDesc,
            is_push,
            updated_at: new Date()
        })
        ctx.body = app.utils.response(result);
    }
    // 推送
    async pushHosts() {
        const { ctx, app } = this;
        const { id } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        const result = await ctx.service.switchHosts.updateHosts(id, {
            is_push: 1,
            updated_at: new Date()
        });
        ctx.body = app.utils.response(result);
    }

    // 删除
    async deleteHosts() {
        const { ctx, app } = this;
        const { id } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        const result = await ctx.service.switchHosts.updateHosts(id, {
            is_delete: 1,
            updated_at: new Date()
        });
        ctx.body = app.utils.response(result);
    }

    // 获取hosts分组信息
    async getHostsInfo() {
        const { ctx, app } = this;
        const { id } = ctx.query;
        if (_.isNil(id)) throw new Error('缺少必要参数id')
        const data = await ctx.service.switchHosts.getHostsInfo(id);
        if (_.isNil(data)) throw new Error('找不到该id下的相关信息');
        await this.readHostsConfig(id, data.groupAddr, (hosts) => {
            data.dataValues.hosts = hosts;
            ctx.body = app.utils.response(true, data);
        });
    }

    // 获取该id下的hosts内容
    async getHostsConfig() {
        const { ctx, app } = this;
        const id = ctx.params.id;
        if (_.isNil(id)) throw new Error('缺少必要参数id')
        const groupAddr = await this.ctx.service.switchHosts.getGroupAddr(id);
        await this.readHostsConfig(id, groupAddr, (hosts) => {
            ctx.body = hosts;
        });
    }

    async readHostsConfig(id, groupAddr, callback) {
        const hostsConfig = fs.readFileSync(groupAddr, { encoding: 'utf-8' });
        callback && callback(hostsConfig);
    }
}

module.exports = SwitchHostsController;