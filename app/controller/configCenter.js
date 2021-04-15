const Controller = require('egg').Controller;
const _ = require('lodash');


class ConfigCenter extends Controller{
    async getConfigList(){
        const {ctx,app} = this;
        const {current,size,tags} = ctx.request.body;
        const data =  await ctx.service.configCenter.queryConfigs({
            current,
            size,
            tags
        });
        ctx.body = app.utils.response(true,{
            data:data.rows,
            count:data.count
        });
    }
    async addConfig(){
        const {ctx,app} = this;
        const {filename,filePath,hostId,remark,tagIds} = ctx.request.body;
        if(_.isNil(filename)) throw new Error('缺少必要参数filename');
        if(_.isNil(filePath)) throw new Error('缺少必要参数filePath');
        if(_.isNil(hostId)) throw new Error('缺少必要参数hostId');
        if(_.isNil(tagIds)) throw new Error('缺少必要参数tagIds');
        const result = await ctx.service.configCenter.addConfig({
            filename,filePath,hostId,remark,tagIds
        });
        ctx.body = app.utils.response(true,result.get({
            plain: true
        }));
    }
    async editConfig(){
        const {ctx,app} = this;
        const {id,filename,filePath,hostId,remark,tagIds} = ctx.request.body;
        if(_.isNil(id)) throw new Error('缺少必要参数id');
        await ctx.service.configCenter.editConfig({
            id,
            filename,
            filePath,
            remark,
            hostId,
            tagIds
        });
        const basicInfo = await ctx.service.configDetail.getConfigBasicInfo(id);
        const noticeUrlList = await ctx.service.configDetail.getNoticeListById(id,'config-center')
        noticeUrlList.forEach(item => {
            app.utils.sendMsg(item.webHook,basicInfo.dataValues,'已更新',ctx.request.header.referer)
        })
        ctx.body = app.utils.response(true);
    }
    async deleteConfig(){
        const {ctx,app} = this;
        const {id} = ctx.request.query;
        if(_.isNil(id)) throw new Error('缺少必要参数id');
        await ctx.service.configCenter.deleteConfig(id);
        const basicInfo = await ctx.service.configDetail.getConfigBasicInfo(id);
        const type = 'config-center'
        const noticeUrlList = await ctx.service.configDetail.getNoticeListById(id,type)
        noticeUrlList.forEach(item => {
            app.utils.sendMsg(item.webHook,basicInfo.dataValues,'已删除',ctx.request.header.referer)
        })
        await ctx.service.configDetail.updateNoticeAllUrl(id,type,{
            is_delete: 1
        });
        ctx.body = app.utils.response(true)
    }
}

module.exports = ConfigCenter;