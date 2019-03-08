const Service = require('egg').Service;
const getPort = require('get-port');
const child_process = require('child_process');

class ProxyServerService extends Service {
  //创建
  async create(proxyServer) {
    return await this.ctx.model.ProxyServer.create(createResult.proxyServer);;
  }
  //关闭
  async close(id){
    return await this.ctx.model.ProxyServer.update({
      status:0
    },{
      where:{
        id
      }
    });
  }
  //重启
  async restart(id){
    return await this.ctx.model.ProxyServer.update({
      status:1
    },{
      where:{
       id
      }
    });
  }
}

module.exports = ProxyServerService;