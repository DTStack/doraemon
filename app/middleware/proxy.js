const c2k = require('koa-connect');
const proxy = require('http-proxy-middleware');
const pathToRegexp = require('path-to-regexp');
module.exports = async function httpproxy(ctx, next) {
  await next();
  const {req,app} = ctx;
  const regexp = pathToRegexp('/proxy/:id/(.*)');
  const strArray = regexp.exec(req.url);
  const realIp = ctx.header['x-real-ip'];
  const proxyServer = await app.model.ProxyServer.findOne({
    attributes:['target','status'],
    where:{
      is_delete:0,
      id:strArray[1]
    }
  });
  if(proxyServer.status===0){
    ctx.body = app.utils.response(false,null,'该代理服务已关闭');
  }else{
    let target = '';
    const proxyRule = await app.model.ProxyRule.findOne({
      attributes:['target'],
      where:{
        is_delete:0,
        ip:realIp,
        proxy_server_id:strArray[1]
      }
    });
    if(proxyRule){
      target=proxyRule.target;
    }else{
      target=proxyServer.target;
    }
    if(target){
      await c2k(proxy({ 
        target: target, 
        pathRewrite:{
          [`^/proxy/${strArray[1]}`]:''
        },
        changeOrigin: true 
      }))(ctx,next)
    }
  }
};
