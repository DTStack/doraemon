const Controller = require('egg').Controller;
const _ = require('lodash');
class ProxyServerController extends Controller{
    //获取服务列表
    async list() {
        const { pageSize, pageNo, search, projectId } = this.ctx.request.body;
        let where = {
            '$or': [
                { name: { '$like': `%${search}%` } },
                { proxy_server_address: { '$like': `%${search}%` } }
            ],
            is_delete: 0
        }
        if (projectId) {
            where.id = projectId
        }
        const result = await this.app.model.ProxyServer.findAndCountAll({
            attributes: ['id', 'name', 'proxy_server_address', 'api_doc_url', 'status', 'target', 'created_at', 'updated_at'],
            where,
            limit: pageSize,
            order: [['updated_at', 'DESC']],
            offset: (pageNo - 1) * pageSize
        });
        this.ctx.body = this.app.utils.response(true, { data: result.rows, count: result.count });
    }
    //创建服务
    async add(){
        const { proxyServer, targetAddrs } = this.ctx.request.body;
        // 创建服务
        const result = await this.ctx.service.proxyServer.create(proxyServer);
        const { id } = result;
        // 存储目标地址信息
        await this.ctx.service.proxyServerAddrs.create(targetAddrs, id);
        this.ctx.body = this.app.utils.response(true, null);
    }

    // 获取目标服务地址列表
    async getTargetAddrs() {
        const { id } = this.ctx.request.query;
        if (_.isNil(id)) throw new Error('缺少必要参数id');
        const result = await this.ctx.service.proxyServerAddrs.queryAddrs(id);
        this.ctx.body = this.app.utils.response(true, result);
    }
  
    //更新服务
    async update(){
        const { proxyServer, targetAddrs } = this.ctx.request.body;
        await this.app.model.ProxyServer.update(proxyServer,{
            where:{
                id:proxyServer.id
            }
        });
        await this.ctx.service.proxyServerAddrs.update(targetAddrs, proxyServer.id);
        this.ctx.body = this.app.utils.response(true, null);
    }

    //删除服务
    async delete(){
        const {id} = this.ctx.request.query;
        // 逻辑删除代理服务下的项目
        await this.app.model.ProxyServer.update({
            is_delete: 1
        }, {
            where: {
                id
            }
        });
        // 逻辑删除代理服务下的项目下的代理服务
        await this.app.model.ProxyRule.update({
            is_delete: 1
        }, {
            where: {
                proxy_server_id: id
            }
        });
        this.ctx.body = this.app.utils.response(true, null);
    }
    //改变状态
    async changeStatus(){
        const {status,id} = this.ctx.request.query;
        let closeResult = false ;
        let restartResult = true;
        if (status==='0'){
            closeResult =  this.ctx.service.proxyServer.close(id);
        } else {
            restartResult = this.ctx.service.proxyServer.restart(id);
        }
        this.ctx.body = this.app.utils.response(status==='0'?closeResult:restartResult,null);
    }
    //获取代理服务下的代理规则
    async ruleList(){
        const {proxy_server_id} = this.ctx.request.query;
        const result = await this.app.model.ProxyRule.findAndCountAll({
            attributes:['id','proxy_server_id','status','ip','target','remark','mode'],
            where:{
                is_delete:0,
                proxy_server_id
            }
        });
        this.ctx.body = this.app.utils.response(true,{
            data:result.rows,
            count:result.count
        });
    }
    //新增代理规则
    async addRule(){
        const {proxy_server_id,target,ip,remark,mode} = this.ctx.request.body;
        const result = await this.app.model.ProxyRule.create({
            proxy_server_id,
            target,
            ip,
            remark,
            status:1,
            mode
        });
        this.ctx.body = this.app.utils.response(result,null);
    }
    //更新代理规则
    async updateRule(){
        const {id,target,ip,remark,mode} = this.ctx.request.body;
        const result = await this.app.model.ProxyRule.update({
            target,
            ip,
            remark,
            mode
        },{
            where:{
                id
            }
        });
        this.ctx.body = this.app.utils.response(result,null);
    }
    //更新代理规则状态
    async updateRuleStatus(){
        const {id,status} = this.ctx.request.body;
        const result = await this.app.model.ProxyRule.update({
            status
        },{
            where:{
                id
            }
        });
        this.ctx.body = this.app.utils.response(result,null);
    }
    //删除代理规则
    async deleteRule(){
        const {id} = this.ctx.request.query;
        const result = await this.app.model.ProxyRule.update({
            is_delete:1
        },{
            where:{
                id
            }
        });
        this.ctx.body = this.app.utils.response(result,null);
    }
    //根据用户IP查询所在的项目列表
    async projectListByUserIP() {
        const { userIP } = this.ctx.request.body;
        this.app.model.ProxyRule.belongsTo(this.app.model.ProxyServer,{ foreignKey: 'proxy_server_id', targetKey: 'id'});
        const result = await this.app.model.ProxyRule.findAndCountAll({
            attributes:['id','status','ip','target','remark'],
            where:{
                is_delete:0,
                ip: userIP
            },
            include: [{
                model: this.app.model.ProxyServer,
                where: {
                    is_delete:0
                },
                attributes:[['id', 'serverId'], ['name', 'serverName'], ['proxy_server_address', 'address'], 'target']
            }]
        });
        let dataObj = {};
        result.rows.forEach(item => {
            const { proxy_server = {}, id, ip, status, target, remark } = item || {};
            const rule = { id, ip, status, target, remark };
            const { serverId, serverName, address } = proxy_server?.dataValues || {};
            if(dataObj.hasOwnProperty(serverId)) {
                dataObj[serverId].rules.push(rule);
            } else {
                dataObj[serverId] = {
                    serverName,
                    address,
                    rules: [
                        rule
                    ]
                }
            }
        });
        const data = Object.keys(dataObj).map((key) => Object.assign({}, { serverId: key }, dataObj[key]))
        this.ctx.body = this.app.utils.response(true, data);
    }
}
module.exports = ProxyServerController;
