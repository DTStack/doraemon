const Service = require('egg').Service;
const _ = require('lodash');

class ConfigCenterService extends Service {
  queryConfigs({
    current,
    size,
    tags
  }){
    const {ctx,app} = this;
    let whereParams = {
      status:1
    }
    if(tags&&tags.length){
      whereParams['tag_ids'] ={
        $in:tags
      }
    }
    let params = {
      attributes:['id','filename','filePath','remark','hostId',[app.Sequelize.col('host_management.host_ip'),'hostIp'],'created_at','updated_at'],
      where:whereParams,
      include: [{
        model: ctx.model.HostManagement,
        attributes:[]
      },
      {
        model: ctx.model.TagManagement,
        as:'tags',
        attributes:['id','tagName','tagColor','tagDesc']
      }],
      // raw:true, // 这个属性表示开启原生查询，原生查询支持的功能更多，自定义更强
      limit:size,
      order:[['updated_at','DESC']],
      offset:size*(current-1)
    }
    return ctx.model.ConfigManagement.findAndCountAll(params)
  }
  addConfig(config){
    return this.ctx.model.ConfigManagement.create(config);
  }
  editConfig(config){
    const {id,filename,filePath,remark,hostId,updateShell,tagIds} = config;
    const newConfig = {};

    if(!_.isNil(filename)) newConfig.filename=filename;
    if(!_.isNil(filePath)) newConfig.filePath=filePath;
    if(!_.isNil(remark)) newConfig.remark=remark;
    if(!_.isNil(hostId)) newConfig.hostId=hostId;
    if(!_.isNil(tagIds)) newConfig.tagIds=tagIds;
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