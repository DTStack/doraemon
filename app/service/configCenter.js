const Service = require('egg').Service;
const _ = require('lodash');

class ConfigCenterService extends Service {
  queryConfigs({
    current,
    size
  }){
    const {ctx,app} = this;
    ctx.model.ConfigManagement.belongsTo(ctx.model.HostManagement,{ foreignKey: 'host_id', targetKey: 'id'});
    return ctx.model.ConfigManagement.findAndCountAll({
      attributes:['id','filename','filePath','remark','hostId',[app.Sequelize.col('host_management.host_ip'),'hostIp']],
      where:{
        status:1
      },
      include: [{
        model: ctx.model.HostManagement,
        attributes:[]
      }],
      limit:size,
      order:[['created_at','DESC']],
      offset:size*(current-1)
    })
  }
  addConfig(config){
    return this.ctx.model.ConfigManagement.create(config);
  }
  editConfig(config){
    const {id,filename,filePath,remark,hostId,updateShell} = config;
    const newConfig = {};

    if(!_.isNil(filename)) newConfig.filename=filename;
    if(!_.isNil(filePath)) newConfig.filePath=filePath;
    if(!_.isNil(remark)) newConfig.remark=remark;
    if(!_.isNil(hostId)) newConfig.hostId=hostId;
    if(!_.isNil(updateShell)) newConfig.updateShell=updateShell;


    return this.ctx.model.ConfigManagement.update(newConfig,{
      where:{
        id
      }
    })
  }
  deleteConfig(id){
    return this.ctx.model.ConfigManagement.update({
      status:0
    },{
      where:{
        id
      }
    });
  }
}
module.exports = ConfigCenterService;