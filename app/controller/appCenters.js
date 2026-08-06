const Controller = require('egg').Controller;
const _ = require('lodash');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

class AppCentersController extends Controller {
    async getAppCenterList() {
        const { app, ctx } = this;
        const { appName = '', appTags } = ctx.request.query;
        const appResult = await app.model.AppCenters.findAndCountAll({
            attributes: [
                'id',
                'appName',
                'appTags',
                'appDesc',
                'appUrl',
                'appType',
                'clickCount',
                'logoUrl',
                'created_at',
                'updated_at',
            ],
            order: [
                ['appType', 'ASC'],
                ['clickCount', 'DESC'],
            ],
            where: {
                status: 1,
                appName: {
                    $like: `%${appName}%`,
                },
            },
        });
        const tagsResult = await ctx.model.TagManagement.findAll(); // query
        const result = [];
        appResult.rows.forEach((item) => {
            const tags = item.get('appTags');
            const tagids = tags ? tags.split(',') : '';
            const tagArrs = tagsResult.filter((ele) => {
                return tagids.includes(`${ele.get('id')}`);
            });
            item.set('appTags', tagArrs);
            if (appTags) {
                if (appTags.split(',').some((ele) => tagids.includes(`${ele}`))) {
                    result.push(item);
                }
            } else {
                result.push(item);
            }
        });
        ctx.body = app.utils.response(true, { data: result, count: result.length });
    }

    async updateApplications() {
        const { app, ctx } = this;
        const { appName, appUrl, appDesc, appTags, id } = ctx.request.body;

        if (_.isNil(appName)) throw new Error('缺少必要参数appName');
        if (_.isNil(appUrl)) throw new Error('缺少必要参数appUrl');
        if (_.isNil(appDesc)) throw new Error('缺少必要参数appDesc');
        if (_.isNil(appTags)) throw new Error('缺少必要参数appTags');

        const result = await ctx.service.appCenters.updateApplications({
            appName,
            appUrl,
            appDesc,
            appTags: appTags.join(),
            id,
            updated_at: moment().format('YYYY-MM-DD'),
        });

        if (id) {
            ctx.body = app.utils.response(true, null);
            return;
        }
        ctx.body = app.utils.response(
            true,
            result.get({
                plain: true,
            })
        );
    }

    async getApplicationById() {
        const { app, ctx } = this;
        const { id } = ctx.request.query;
        const result = await app.model.AppCenters.findOne({
            attributes: [
                'id',
                'appName',
                'appDesc',
                'appTags',
                'appUrl',
                'created_at',
                'updated_at',
            ],
            where: {
                id,
            },
        });
        ctx.body = app.utils.response(true, result);
    }

    async clickApplications() {
        const { app, ctx } = this;
        const { params } = ctx.request.body;
        const result = await ctx.service.appCenters.clickApplications({
            ...params,
        });
        ctx.body = app.utils.response(true, result);
    }

    async deleteApplications() {
        const { app, ctx } = this;
        const { id } = ctx.request.body;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        const result = await ctx.service.appCenters.deleteApplications(id);
        ctx.body = app.utils.response(true, result);
    }
    // 上传logo
    async uploadLogo() {
        const { app, ctx } = this;
        const id = ctx.params.id;
        const files = ctx.request.files
            ? Array.isArray(ctx.request.files)
                ? ctx.request.files
                : [ctx.request.files]
            : [];
        const file = files[0];
        if (!file) {
            ctx.throw(400, '缺少上传文件');
        }
        // 全局 multipart 已经是 file 模式，这里直接复用临时文件，避免重复消费请求体
        const fileName = file.filename;
        // 目标文件夹，没有就创建，创建多级目录存储
        const date = new Date();
        const dirTree = [
            'resources',
            'imgs',
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
        ];
        const dir = app.utils.createFolder(dirTree);
        // 创建文件
        const target = path.join(dir, fileName);
        try {
            fs.copyFileSync(file.filepath, target);
        } catch (err) {
            throw new Error('图片上传出错');
        } finally {
            if (file.filepath && fs.existsSync(file.filepath)) {
                fs.unlinkSync(file.filepath);
            }
        }
        const result = await this.ctx.model.AppCenters.update(
            { logoUrl: [...dirTree, fileName].join('/') },
            {
                where: {
                    id,
                },
            }
        );
        ctx.body = app.utils.response(true, result);
    }
}
module.exports = AppCentersController;
