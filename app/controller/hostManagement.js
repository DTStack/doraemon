const Controller = require('egg').Controller;
const _ = require('lodash');

class HostManagementController extends Controller{
  //主机列表
  async queryHosts(){
    const data =  await  this.ctx.service.hostManagement.queryHosts();
    this.ctx.body = this.app.utils.response(true,data);
  }
  //新增主机
  async addHost(){
    const {hostIp,hostName,username,password,remark} = this.ctx.request.body;
    if(_.isNil(hostIp)) throw new Error('缺少必要参数hostIp');
    if(_.isNil(hostName)) throw new Error('缺少必要参数hostName');
    if(_.isNil(username)) throw new Error('缺少必要参数username');
    if(_.isNil(password)) throw new Error('缺少必要参数password');
    await this.ctx.service.hostManagement.addHost({
      hostIp,hostName,username,password,remark
    });
    this.ctx.body = this.app.utils.response(true,result.get({
      plain: true
    }));
  }
  //编辑主机
  async editHost(){
    const {id,hostIp,hostName,username,password,remark} = this.ctx.request.body;
    if(_.isNil(id)) throw new Error('缺少必要参数id');
    await this.ctx.service.hostManagement.editHost({
      id,
      hostIp,
      hostName,
      remark,
      username,
      password
    });
    this.ctx.body = this.app.utils.response(true);
  }
  //删除主机
  async deleteHost(){
    const {id} = this.ctx.request.query;
    if(_.isNil(id)) throw new Error('缺少必要参数id');
    await this.ctx.service.hostManagement.deleteHost(id);
    this.ctx.body = this.app.utils.response(true)
  }
}

module.exports = HostManagementController;