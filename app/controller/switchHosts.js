const Controller = require('egg').Controller;
const NodeSsh = require('node-ssh');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
// const { createWS } = require('../utils/ws');
const DEFAULT_HOST = '172.16.100.225';
const DEFAULT_PATH = '/home/app/dt-doraemon/public/hosts/';
const DEFAULT_CONNECT = {
    host: DEFAULT_HOST,
    username: 'root',
    password: 'abc123'
};

class SwitchHostsController extends Controller {
    // 获取列表数据
    async getHostsList() {
        const { app, ctx } = this;
        const { current, size } = ctx.request.body;
        const data = await ctx.service.switchHosts.getHostsList({
            size,
            current
        });
        ctx.body = app.utils.response(true, {
            data: data.rows,
            count: data.count
        });
    }

    // 创建hosts群组
    async createHosts() {
        const { app, ctx } = this;
        const { groupName, groupDesc, hosts = '' } = ctx.request.body;
        if (_.isNil(groupName)) throw new Error('缺少必要参数groupName');
        // 数据库插入数据
        const data = await ctx.service.switchHosts.createHosts({
            groupName,
            groupDesc
        });
        if (_.isNil) throw new Error('创建失败');
        // 创建对应hosts文件
        const hostsPath = 'hosts_' + data.id;
        const groupAddr = path.join(DEFAULT_PATH, hostsPath);
        const groupAddrCache = path.join(__dirname, '../../cache/' + hostsPath);
        await this.editHostsConfig(groupAddr, groupAddrCache, hosts);
        // 创建websocket连接
        // createWS(8080, '/websocket_' + data.id);
        // 更新数据
        const groupApi = `/api/switch-hosts/connect/${data.id}`;
        const result = await ctx.service.switchHosts.updateHosts(data.id, {
            groupApi,
            // groupId,
            groupAddr
        });
        data.dataValues.groupAddr = groupAddr;
        data.dataValues.groupApi = groupApi;
        ctx.body = app.utils.response(result, data);
    }

    // 更新hosts群组
    async updateHosts() {
        const { ctx, app } = this;
        const { hosts, id, groupName, groupDesc } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        if (_.isNil(groupName)) throw new Error('缺少必要参数groupName');
        // 更新hosts
        const groupAddr = await ctx.service.switchHosts.getGroupAddr(id);
        const groupAddrCache = path.join(__dirname, '../../cache/' + 'hosts_' + id);
        await this.editHostsConfig(groupAddr, groupAddrCache, hosts);
        // 更新参数
        const result = await ctx.service.switchHosts.updateHosts(id, {
            groupName,
            groupDesc,
            updated_at: new Date()
        })
        ctx.body = app.utils.response(result);
    }

    // 编译hosts文件内容
    async editHostsConfig(groupAddr, groupAddrCache, hosts) {
        const { app } = this;
        fs.writeFileSync(groupAddrCache, hosts);
        const ssh = new NodeSsh();
        try {
            app.logger.info(`开始连接服务器${DEFAULT_HOST}...`);
            await ssh.connect(DEFAULT_CONNECT);
            await ssh.putFile(groupAddrCache, groupAddr);
            ssh.dispose();
            app.logger.info(`服务器${DEFAULT_HOST}断开`);
            fs.unlinkSync(groupAddrCache);
        } catch (err) {
            ssh.dispose();
            app.logger.info(`服务器${DEFAULT_HOST}断开`);
            fs.unlinkSync(groupAddrCache);
            throw err;
        }
    }

    // 获取hosts群组信息
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
            ctx.body = app.utils.response(true, hosts);
        });
    }

    async readHostsConfig(id, groupAddr, callback) {
        const { app, ctx } = this;
        const groupAddrCache = path.join(__dirname, '../../cache/' + 'hosts_' + id);
        const ssh = new NodeSsh();
        try {
            app.logger.info(`开始连接服务器${DEFAULT_HOST}...`);
            await ssh.connect(DEFAULT_CONNECT);
            await ssh.getFile(groupAddrCache, groupAddr);
            const hostsConfig = fs.readFileSync(groupAddrCache, { encoding: 'utf-8' });
            ssh.dispose();
            app.logger.info(`服务器${DEFAULT_HOST}断开`);
            fs.unlinkSync(groupAddrCache);
            callback && callback(hostsConfig);
        } catch (err) {
            ssh.dispose();
            app.logger.info(`服务器${DEFAULT_HOST}断开`);
            throw err;
        }
    }
}

module.exports = SwitchHostsController;