const Service = require('egg').Service;
const httpProxy = require('http-proxy');
const getPort = require('get-port');
const pidFromPort = require('pid-from-port');
class ProxyServerService extends Service {
  //创建
  async create(proxyServer) {
    const createResult = await this.createProxyServer(proxyServer);
    if(createResult.success){
      const insertResult =  await this.ctx.model.ProxyServer.create(createResult.proxyServer);;
      return insertResult;
    }else{
      return false;
    }
  }
  //关闭
  async close(id){
    const proxyServer = await this.ctx.model.ProxyServer.findOne({
      where:{
        id
      }
    });
    await this.closeProxyServer(proxyServer.pid);
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
    const proxyServer = await this.ctx.model.ProxyServer.findOne({
      where:{
        id
      }
    });
    const createResult = await this.createProxyServer(proxyServer);
    if(createResult.success){
      const updateResult = await this.ctx.model.ProxyServer.update({
        proxy_server_address:createResult.proxyServer.proxy_server_address,
        pid:createResult.proxyServer.pid,
        status:1
      },{
        where:{
         id
        }
      });
      return updateResult;
    }else{
      return false;
    }
  }
  //启动代理服务
  createProxyServer(proxyServer){
    return new Promise(async (resolve,reject)=>{
      const {target} = proxyServer;
      const server = httpProxy.createProxyServer({
        target
      });
      const port =  await getPort();
      const {request} = this.ctx;
      const {protocol,hostname} = request;
      server.on('close',(res, socket, head)=>{
        this.ctx.model.ProxyServer.update({
          status:0
        },{
          where:{
            pid:proxyServer.pid
          }
        });
      });
      server.listen(port);

      proxyServer['proxy_server_address'] = `${protocol}://${hostname}:${port}`;
      proxyServer.pid = await pidFromPort(port);
      proxyServer.status = 1; 
      this.app.proxyServer[proxyServer.pid]=server;
      resolve({
        success:true,
        proxyServer
      });
    })
  } 
  //关闭服务
  async closeProxyServer(pid){
    try{
      this.app.proxyServer[proxyServer.pid].close();
      return true;
    }catch(e){
      return false;
    }
  }
}

module.exports = ProxyServerService;