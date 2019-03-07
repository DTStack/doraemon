const httpProxy = require('http-proxy')
const pathToRegexp = require('path-to-regexp');
const proxy = httpProxy.createProxyServer({});
module.exports = async function httpproxy(ctx, next) {
  return new Promise(async (resolve, reject) => {
    await next();
    const url = ctx.req.url;
    console.log(url);
    const regexp = pathToRegexp('/proxy/:id/(.*)');
    const strArray = regexp.exec(url)
    const proxyServer = await ctx.model.ProxyServer.findOne({
      where:{
        is_delete:0,
        id:strArray[1]
      }
    });
   
    ctx.req.url = `/${strArray[2]}`;
    console.log(ctx.req.url);
    console.log(proxyServer.target);
    proxy.web(ctx.req, ctx.res,{
      target:proxyServer.target
    }, (e) => {
      const status = {
        ECONNREFUSED: 503,
        ETIMEOUT: 504,
      }[e.code]
      if (status) ctx.status = status
      resolve();
    })
  })
};
