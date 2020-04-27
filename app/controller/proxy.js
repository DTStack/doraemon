const Controller = require('egg').Controller;
class ProxyServerController extends Controller{
  //获取服务列表
  async list(){
    const {pageSize,pageNo,search} = this.ctx.request.body
    const result = await this.app.model.ProxyServer.findAndCountAll({
      attributes:['id','name','proxy_server_address','status','target','created_at','updated_at'],
      where:{
        is_delete:0,
        name:{
          '$like':`%${search}%`
        }
      },
      limit:pageSize,
      order:[['updated_at','DESC']],
      offset:(pageNo-1)*pageSize
    });
    this.ctx.body = this.app.utils.response(true,{data:result.rows,count:result.count});
  }
  //创建服务
  async add(){
    const proxyServer = this.ctx.request.body;
    const result = await this.ctx.service.proxyServer.create(proxyServer);
    this.ctx.body = this.app.utils.response(result,null);
  }
  //更新服务
  async update(){
    const proxyServer = this.ctx.request.body;
    const result = await this.app.model.ProxyServer.update(proxyServer,{
      where:{
        id:proxyServer.id
      }
    });
    this.ctx.body = this.app.utils.response(true,result);
  }
  //删除服务
  async delete(){
    const {id} = this.ctx.request.query;
    const result = await this.app.model.ProxyServer.update({
      is_delete:1
    },{
      where:{
        id
      }
    });
    this.ctx.body = this.app.utils.response(true,result);
  }
  //改变状态
  async changeStatus(){
    const {status,id} = this.ctx.request.query;
    let closeResult = false ;
    let restartResult = true;
    if(status==='0'){
      closeResult =  this.ctx.service.proxyServer.close(id);
    }else{
      restartResult = this.ctx.service.proxyServer.restart(id);
    }
    this.ctx.body = this.app.utils.response(status==='0'?closeResult:restartResult,null);
  }
  //获取代理服务下的代理规则
  async ruleList(){
    const {proxy_server_id} = this.ctx.request.query;
    const result = await this.app.model.ProxyRule.findAndCountAll({
      attributes:['id','proxy_server_id','ip','target','remark'],
      where:{
        is_delete:0,
        proxy_server_id
      }
    });
    this.ctx.body = this.app.utils.response(true,{
      data:result.rows,
      count:result.count
    });
  }
  //新增代理规则
  async addRule(){
    const {proxy_server_id,target,ip,remark} = this.ctx.request.body;
    const result = await this.app.model.ProxyRule.create({
      proxy_server_id,
      target,
      ip,
      remark
    });
    this.ctx.body = this.app.utils.response(result,null);
  }
  //更新代理规则
  async updateRule(){
    const {id,target,ip,remark} = this.ctx.request.body;
    const result = await this.app.model.ProxyRule.update({
      target,
      ip,
      remark
    },{
      where:{
        id
      }
    });
    this.ctx.body = this.app.utils.response(result,null);
  }
  //删除代理规则
  async deleteRule(){
    const {id} = this.ctx.request.query;
    const result = await this.app.model.ProxyRule.update({
      is_delete:1
    },{
      where:{
        id
      }
    });
    this.ctx.body = this.app.utils.response(result,null);
  }
}
module.exports = ProxyServerController;