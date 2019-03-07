const Controller = require('egg').Controller;
const httpProxy = require('http-proxy');
const pathToRegexp = require('path-to-regexp');
const proxy = httpProxy.createProxyServer({});
class ProxyServerController extends Controller{
  //获取服务列表
  async list(){
    const result = await this.app.model.ProxyServer.findAndCountAll({
      where:{
        is_delete:0
      }
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
    const proxyServer = this.ctx.request.body
    const result = await this.app.model.ProxyServer.update(proxyServer,{
      where:{
        id:proxyServer.id
      }
    });
    this.ctx.body = this.app.utils.response(true,result);
  }
  async proxy(){
    const {req,res} = this.ctx;
    const regexp = pathToRegexp('/proxy/:id/(.*)');
    const strArray = regexp.exec(req.url);
    req.url = `/${strArray[2]}`;
    const proxyServer = await this.app.model.ProxyServer.findOne({
      where:{
        is_delete:0,
        id:strArray[1]
      }
    });
    return new Promise((resolve, reject)=>{
      proxy.web(req, res, { 
        target:proxyServer.target,
        changeOrigin: true
      },(e)=>{
        const status = {
          ECONNREFUSED: 503,
          ETIMEOUT: 504,
        }[e.code]
        if (status) ctx.status = status
      });
    })
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
}
module.exports = ProxyServerController;