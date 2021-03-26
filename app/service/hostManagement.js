const _ = require('lodash');
const Service = require('egg').Service;

class HostManagementService extends Service {
    async queryHosts(params){
        const {ctx} = this;
        const { tags='' } = params;
        let hostReulst = await ctx.model.HostManagement.findAll({
            attributes:['id','hostIp','hostName','remark','username','password','tags'],
            where: {
                status: 1
            }
        });
        let tagsResult = await ctx.model.TagManagement.findAll();
        let result = [];
        hostReulst.forEach(item => {
            let tagids = item.get('tags').split(',');
            let tagArrs = tagsResult.filter(ele => {
                return tagids.includes(`${ele.get('id')}`)
            });
            item.set('tags',tagArrs);
            if (tags){
                if (tags.split(',').some(ele=>tagids.includes(`${ele}`))){
                    result.push(item)
                }
            } else {
                result.push(item)
            }
        });
        return result
    }
    addHost(host){
        const {ctx} = this;
        return ctx.model.HostManagement.create(host);
    }
    editHost(host){
        const {ctx} = this;
        const {id,hostIp,hostName,remark,username,password,tags} = host;
        const newHost = {};
        if (!_.isNil(hostIp)) newHost.hostIp=hostIp;
        if (!_.isNil(hostName)) newHost.hostName=hostName;
        if (!_.isNil(remark)) newHost.remark=remark;
        if (!_.isNil(username)) newHost.username=username;
        if (!_.isNil(password)) newHost.password=password;
        if (!_.isNil(tags)) newHost.tags=tags;

        return ctx.model.HostManagement.update(newHost,{
            where:{
                id
            }
        })
    }
    deleteHost(id){
        const {ctx} = this;
        return ctx.model.HostManagement.update({
            status:0
        },{
            where:{
                id
            }
        });
    }
}
module.exports = HostManagementService;