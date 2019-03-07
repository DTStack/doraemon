const utils = require('./app/utils');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer({});
module.exports = class AppBootHook {
  constructor(app) {
    this.app = app;
  }
  async serverDidReady() {
    this.app.utils = utils;
    this.app.proxyServer={};
    const rows = await this.app.model.ProxyServer.findAll({
      attributes:['id','pid','status','target'],
      where:{
        is_delete:0,
        status:1
      }
    });
    rows.forEach((row)=> {
      this.app.proxyServer[row.id] = row.target;
     
    });
    // setInterval(()=>{
    //   this.app.model.ProxyServer.findAll({
    //     attributes:['id','pid','status'],
    //     where:{
    //       is_delete:0,
    //       status:1
    //     }
    //   }).then((rows)=>{
    //     rows.forEach((row)=> {
    //       find('pid',row.pid).then((pidList)=>{
    //         if(pidList.length===0){
    //           this.app.proxyServer[row.pid]=null;
    //           this.app.model.ProxyServer.update({
    //             status:0
    //           },{
    //             where:{
    //              id:row.id
    //             }
    //           });
    //         }
    //       });
    //     });
    //   });
    // },10000);
  }
}