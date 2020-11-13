const Controller = require('egg').Controller;

class CommonController extends Controller{
  async getConfigJson(){
    const {app,ctx} = this;
    const {owner,configRepositoryName} = app.config.github;
    const {name} = ctx.request.query;
    const result = await ctx.curl(`https://${owner}.github.io/${configRepositoryName}/${name}`,{
      dataType: 'json'
    });
    ctx.body = app.utils.response(result.status===200,result.data,result.status===200?null:'请求失败');
  }
  async getLocalIp(){
    const {app,ctx} = this;
    const localIp = ctx.ip
    ctx.body = app.utils.response(true,localIp);
  }
  async getServerInfo() {
    const { app, ctx } = this;
    ctx.body = app.utils.response(true, {
      host: ctx.host,
      protocol: ctx.protocol
    })
  }
}
module.exports = CommonController;