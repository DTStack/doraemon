const _ = require('lodash');
const Service = require('egg').Service;

class HostManagementService extends Service {
  queryHosts(){
    return this.ctx.model.HostManagement.findAll({
      attributes:['id','hostIp','hostName','remark','username','password'],
      where:{
        status:1
      }
    })
  }
  addHost(host){
    return this.ctx.model.HostManagement.create(host);
  }
  editHost(host){
    const {id,hostIp,hostName,remark,username,password} = host;
    const newHost = {};

    if(!_.isNil(hostIp)) newHost.hostIp=hostIp;
    if(!_.isNil(hostName)) newHost.hostName=hostName;
    if(!_.isNil(remark)) newHost.remark=remark;
    if(!_.isNil(username)) newHost.username=username;
    if(!_.isNil(password)) newHost.password=password;

    return this.ctx.model.HostManagement.update(newHost,{
      where:{
        id
      }
    })
  }
  deleteHost(id){
    return this.ctx.model.HostManagement.update({
      status:0
    },{
      where:{
        id
      }
    });
  }
}
module.exports = HostManagementService;