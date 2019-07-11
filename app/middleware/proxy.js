const c2k = require('koa-connect');
const proxy = require('http-proxy-middleware');
module.exports = async function httpproxy(ctx, next) {
  await next();
  const {app} = ctx;
  //获取代理服务id
  const serverId = ctx.params.id;
  //获取真实访问者ip
  const realIp = ctx.header['x-real-ip'];
  //根据代理服务id查询代理服务
  const proxyServer = await app.model.ProxyServer.findOne({
    attributes:['target','status'],
    where:{
      is_delete:0,
      id:serverId
    }
  });
  //判断代理服务是否被禁用
  if(proxyServer.status===0){
    ctx.body = app.utils.response(false,null,'该代理服务已关闭');
  }else{
    let target = '';
    //根据代理服务id和真实访问者ip查询代理规则
    const proxyRule = await app.model.ProxyRule.findOne({
      attributes:['target'],
      where:{
        is_delete:0,
        ip:realIp,
        proxy_server_id:serverId
      }
    });
    //判断代理服务id和真实访问者ip是否有对应的代理规则
    if(proxyRule){
      target=proxyRule.target;
    }else{
      target=proxyServer.target;
    }
    if(target){
      await c2k(proxy({
        target,
        pathRewrite:{
          [`^/proxy/${serverId}`]:''
        },
        changeOrigin: true
      }))(ctx,next)
    }
  }
};
