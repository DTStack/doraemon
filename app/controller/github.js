const Controller = require('egg').Controller;

class GithubController extends Controller{
  async getConfigJson(){
    const {app,ctx} = this;
    const {owner,configRepositoryName} = app.config.github;
    const {name} = ctx.request.body;
    const result = await ctx.curl(`https://${owner}.github.io/${configRepositoryName}/${name}`,{
      dataType: 'json'
    });
    ctx.body = app.utils.response(result.status===200,result.data,result.status===200?null:'请求失败');
  }
}
module.exports = GithubController;