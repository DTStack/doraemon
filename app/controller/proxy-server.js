module.exports = (app) =>{
  return class API extends app.Controller{
    async create (){
      const list = await this.ctx.model.ProxyServer.findAll();
      this.ctx.body = list;
    }
  }
}