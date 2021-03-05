const Service = require('egg').Service;
const _ = require('lodash');

class ProxyServerAddrsService extends Service {
    // 创建
    async create(addrs, proxy_server_id) {
        Array.isArray(addrs) && addrs.forEach(async (addr) => {
            addr.proxy_server_id = proxy_server_id;
            await this.ctx.model.ProxyServerAddrs.create(addr);
        })
        return true;
    }

    // 获取服务下目标服务地址列表
    async queryAddrs(proxy_server_id) {
        return this.ctx.model.ProxyServerAddrs.findAll({
            where: {
                proxy_server_id,
                is_delete: 0
            },
            order: [['updated_at', 'DESC']]
        })
    }

    // 更新 | 新增
    // 删除，同更新，让前端传个is_delete = 1
    async update(addrs, proxy_server_id) {
        Array.isArray(addrs) && addrs.forEach(async (addr) => {
            addr.proxy_server_id = proxy_server_id;
            if (addr.id) {
                await this.ctx.model.ProxyServerAddrs.update(addr, {
                    where: {
                        id: addr.id
                    }
                })
            } else {
                await this.ctx.model.ProxyServerAddrs.create(addr);
            }
        })
    }
}

module.exports = ProxyServerAddrsService;