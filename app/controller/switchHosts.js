const Controller = require('egg').Controller;
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

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

    // 创建hosts
    async createHosts() {
        const { app, ctx } = this;
        const { groupName, groupDesc, hosts = '' } = ctx.request.body;
        if (_.isNil(groupName)) throw new Error('缺少必要参数groupName');
        // 创建对应hosts文件
        const count = await ctx.model.SwitchHosts.count();
        const hostDir = path.join(__dirname, '../../public/hosts');
        const hostsPath = path.join(hostDir, 'hosts_' + count);
        if (!fs.existsSync(hostDir)) {
            fs.mkdirSync(hostDir);
        }
        fs.writeFileSync(hostsPath, hosts);

        // 数据库插入数据
        const initParams = {
            groupName,
            groupDesc: groupDesc || '',
            groupApi: 'test',
            groupId: 'test',
            groupAddr: hostsPath,
            created_at: new Date(),
            updated_at: new Date()
        }
        const data = await ctx.service.switchHosts.createHosts(initParams);
        ctx.body = app.utils.response(true, data)
    }

    // 更新hosts
    async updateHosts() {
        const { ctx, app } = this;
        const { hosts, id, groupName, groupDesc } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        if (_.isNil(groupName)) throw new Error('缺少必要参数groupName');
        const data = await ctx.model.SwitchHosts.findOne({
            attributes: ['groupAddr'],
            where: { id }
        })
        // 更新hosts
        fs.writeFileSync(data.groupAddr, hosts);
        // 更新参数
        const result = await ctx.service.switchHosts.updateHosts({
            id,
            groupName,
            groupDesc
        })
        ctx.body = app.utils.response(result);
    }

    // 获取hosts信息
    async getHostsInfo() {
        const { ctx, app } = this;
        const { id } = ctx.query;
        if (_.isNil(id)) throw new Error('缺少必要参数id')
        const data = await ctx.service.switchHosts.getHostsInfo({ id });
        if (_.isNil(data)) throw new Error('找不到该id下的相关信息');
        const hostsPath = data.groupAddr;
        try {
            const file = fs.readFileSync(hostsPath, { encoding: 'utf-8' });
            data.dataValues.hosts = file;
            ctx.body = app.utils.response(true, data);
        } catch (err) {
            throw err;
        }
    }
}

module.exports = SwitchHostsController;