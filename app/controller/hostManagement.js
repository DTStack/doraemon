const Controller = require('egg').Controller;
const _ = require('lodash');

class HostManagementController extends Controller{
  //主机列表
  async queryHosts(){
    const {ctx,app} = this;
    const data =  await  ctx.service.hostManagement.queryHosts();
    ctx.body = app.utils.response(true,data);
  }
  //新增主机
  async addHost(){
    const {ctx,app} = this;
    const {hostIp,hostName,username,password,remark} = ctx.request.body;
    if(_.isNil(hostIp)) throw new Error('缺少必要参数hostIp');
    if(_.isNil(hostName)) throw new Error('缺少必要参数hostName');
    if(_.isNil(username)) throw new Error('缺少必要参数username');
    if(_.isNil(password)) throw new Error('缺少必要参数password');
    const result = await ctx.service.hostManagement.addHost({
      hostIp,hostName,username,password,remark
    });
    ctx.body = app.utils.response(true,result.get({
      plain: true
    }));
  }
  //编辑主机
  async editHost(){
    const {ctx,app} = this;
    const {id,hostIp,hostName,username,password,remark} = ctx.request.body;
    if(_.isNil(id)) throw new Error('缺少必要参数id');
    await ctx.service.hostManagement.editHost({
      id,
      hostIp,
      hostName,
      remark,
      username,
      password
    });
    ctx.body = app.utils.response(true);
  }
  //删除主机
  async deleteHost(){
    const {ctx,app} = this;
    const {id} = ctx.request.query;
    if(_.isNil(id)) throw new Error('缺少必要参数id');
    await ctx.service.hostManagement.deleteHost(id);
    ctx.body = app.utils.response(true)
  }
}

module.exports = HostManagementController;