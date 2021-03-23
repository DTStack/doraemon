const Service = require('egg').Service;

class ProxyServerService extends Service {
    //创建
    async create(proxyServer) {
        const {host,protocol} = this.ctx;
        proxyServer.proxy_server_address=`${protocol}://${host}/proxy`;
        proxyServer.status = 1;
        const insertResult = await this.ctx.model.ProxyServer.create(proxyServer);
        const {id,proxy_server_address} = insertResult;
        const updateResult = await this.ctx.model.ProxyServer.update({
            proxy_server_address:`${proxy_server_address}/${id}`
        },{
            where:{
                id
            }
        });
        return { id };
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