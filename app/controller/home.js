const Model = require('../mocks/article/list');
module.exports = app => {
  return class AppController extends app.Controller {
    async index() {
      const { ctx } = this;
      if(ctx.url==='/'){
        ctx.response.redirect('/page/toolbox');
      }else{
        await ctx.render('app.js', { url: ctx.url });
      }
    }

    async client() {
      const { ctx } = this;
      await ctx.renderClient('app.js', Model.getPage(1, 10));
    }
  };
};