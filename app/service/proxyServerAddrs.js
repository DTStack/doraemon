const Service = require('egg').Service;

class ProxyServerAddrsService extends Service {
  // 创建
  async create(addrs, id) {
    Array.isArray(addrs) && addrs.forEach(async (addr) => {
      addr.proxy_server_id = id;
      await this.ctx.model.ProxyServerAddrs.create(addr);
    })
    return true;
  }

  // 获取服务下目标服务地址列表
  async queryAddrs(id) {
    return this.ctx.model.ProxyServerAddrs.findAll({
      where: {
        proxy_server_id: id
      },
      order: [['updated_at', 'DESC']]
    })
  }

  // 更新，有新增的做创建
  async update(addrs, id) {
    Array.isArray(addrs) && addrs.forEach(async (addr) => {
      addr.proxy_server_id = id;
      if(addr.id) {
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