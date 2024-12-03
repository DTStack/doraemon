const fs = require('fs');
const path = require('path');
const Controller = require('egg').Controller;
const _ = require('lodash');
const NodeSsh = require('node-ssh');

class ConfigDetail extends Controller {
    async getBasicInfo() {
        const { ctx, app } = this;
        const { id } = ctx.query;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        const data = await ctx.service.configDetail.getConfigBasicInfo(id);
        if (_.isNil(data)) throw new Error('获取不到该文件的相关信息');
        ctx.body = app.utils.response(true, data);
    }
    async getNoticeList() {
        const { ctx, app } = this;
        const { id, type } = ctx.query;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        const data = await ctx.service.configDetail.getNoticeListById(id, type);
        ctx.body = app.utils.response(true, data);
    }
    async delNoticeUrl() {
        const { ctx, app } = this;
        const { id, type } = ctx.query;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        const data = await ctx.service.configDetail.updateNoticeUrl(id, type, {
            is_delete: 1,
        });
        ctx.body = app.utils.response(true, data);
    }
    async addNoticeUrl() {
        const { ctx, app } = this;
        const { id, accept_group, type, webHook } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        if (_.isNil(webHook)) throw new Error('缺少必要参数webHook');
        const data = await ctx.service.configDetail.addNoticeUrl(id, webHook, type, accept_group);
        ctx.body = app.utils.response(true, data);
    }
    async getRemoteConfig() {
        const { ctx, app } = this;
        const { id } = ctx.query;
        const configDetail = await ctx.service.configDetail.getConfigSpecificInfo(id, [
            'id',
            'filename',
            'filePath',
            [app.Sequelize.col('host_management.host_ip'), 'hostIp'],
            [app.Sequelize.col('host_management.username'), 'username'],
            [app.Sequelize.col('host_management.password'), 'password'],
        ]);
        if (_.isNil(configDetail)) {
            throw new Error('获取不到该文件的相关信息');
        } else {
            const { filePath, filename, hostIp, username, password } = configDetail.dataValues;
            const ssh = new NodeSsh();
            app.logger.info(`开始连接服务器${hostIp}...`);
            await ssh.connect({
                host: hostIp,
                username,
                port: 22,
                password,
            });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { stdout, stderr } = await ssh.execCommand(
                `cat ${path.join(filePath, filename)}`
            );
            ssh.dispose();
            app.logger.info(`服务器${hostIp}断开`);
            ctx.body = app.utils.response(true, stdout);
            // ctx.body = app.utils.response(true,_.isEmpty(stderr)?stdout:'');
        }
    }
    async saveConfig() {
        const { ctx, app } = this;
        const { id, config, shell, basicInfo } = ctx.request.body;
        const configDetail = await ctx.service.configDetail.getConfigSpecificInfo(id, [
            'id',
            'filename',
            'filePath',
            [app.Sequelize.col('host_management.host_ip'), 'hostIp'],
            [app.Sequelize.col('host_management.username'), 'username'],
            [app.Sequelize.col('host_management.password'), 'password'],
        ]);
        const noticeUrlList = await ctx.service.configDetail.getNoticeListById(id, 'config-center');
        noticeUrlList.forEach((item) => {
            app.utils.sendMsg(item.webHook, basicInfo, '已更新', ctx.request.header.referer);
        });
        const { filePath, filename, hostIp, username, password } = configDetail.dataValues;
        const configFilePath = path.join(__dirname, '../../cache/', filename);
        const shellPath = path.join(__dirname, '../../cache', `${filename}_shell`);
        fs.writeFileSync(configFilePath, config);
        fs.writeFileSync(shellPath, shell);
        const remoteConfigFilePath = path.join(filePath, filename);
        const remoteShellPath = path.join(filePath, `${filename}_shell`);
        const ssh = new NodeSsh();
        try {
            app.logger.info(`开始连接服务器${hostIp}...`);
            await ssh.connect({
                host: hostIp,
                username,
                port: 22,
                password,
            });
            await ssh.putFile(configFilePath, remoteConfigFilePath);
            await ssh.putFile(shellPath, remoteShellPath);
            const { stderr: execShellStderr } = await ssh.execCommand(`bash ${remoteShellPath}`);
            const { stderr: deleteShellStderr } = await ssh.execCommand(`rm ${remoteShellPath}`);
            if (deleteShellStderr) {
                throw new Error(deleteShellStderr);
            }
            if (execShellStderr) {
                await ssh.execCommand(`rm ${remoteShellPath}`);
                throw new Error(execShellStderr);
            }
            await ctx.service.configCenter.editConfig({
                id,
                updateShell: shell,
            });
            ssh.dispose();
            app.logger.info(`服务器${hostIp}断开`);
            fs.unlinkSync(configFilePath);
            fs.unlinkSync(shellPath);
            ctx.body = app.utils.response(true);
        } catch (err) {
            ssh.dispose();
            app.logger.info(`服务器${hostIp}断开`);
            fs.unlinkSync(configFilePath);
            fs.unlinkSync(shellPath);
            throw err;
        }
    }
}

module.exports = ConfigDetail;
