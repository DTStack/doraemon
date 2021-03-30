const Service = require('egg').Service;
const _ = require('lodash');

class ConfigDetailService extends Service {
    async getConfigBasicInfo(id){
        const {ctx,app} = this;
        ctx.model.ConfigManagement.belongsTo(ctx.model.HostManagement,{ foreignKey: 'host_id', targetKey: 'id'});
        return ctx.model.ConfigManagement.findOne({
            attributes:['id','filename','filePath','remark','updateShell','hostId',[app.Sequelize.col('host_management.host_ip'),'hostIp'],[app.Sequelize.col('host_management.host_name'),'hostName'],[app.Sequelize.col('host_management.username'),'username'],[app.Sequelize.col('host_management.password'),'password']],
            where:{
                id
            },
            include: [{
                model: ctx.model.HostManagement,
                attributes:[]
            }]
        })
    }
    async getNoticeListById(id,type) {
        const {ctx} = this;
        return ctx.model.ConfigNoticeUrl.findAll({
            attributes:['id','webHook','accept_group'],
            where:{
                configId: id,
                type,
                is_delete: 0
            }
        })
    }
    async addNoticeUrl(id,webHook,type,accept_group) {
        const {ctx} = this;
        return ctx.model.ConfigNoticeUrl.create({
            configId: id,
            webHook,
            type,
            accept_group,
            is_delete: 0
        })
    }
    async updateNoticeUrl(id, type, updateParams) {
        const { ctx } = this;
        return ctx.model.ConfigNoticeUrl.update(updateParams, {
            where: { id, type }
        })
    }
    async updateNoticeAllUrl(id, type, updateParams) {
        const { ctx } = this;
        return ctx.model.ConfigNoticeUrl.update(updateParams, {
            where: { type, configId: id }
        })
    }
    async getConfigSpecificInfo(id,attributes=[]){
        const {ctx,app} = this;
        ctx.model.ConfigManagement.belongsTo(ctx.model.HostManagement,{ foreignKey: 'host_id', targetKey: 'id'});
        return ctx.model.ConfigManagement.findOne({
            attributes,
            where:{
                id
            },
            include: [{
                model: ctx.model.HostManagement,
                attributes:[]
            }]
        })
    }
}

module.exports = ConfigDetailService