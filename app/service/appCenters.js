const Service = require('egg').Service;
const _ = require('lodash');

class AppCentersService extends Service {
    updateApplications(config) {
        const { id, appName, appUrl, appDesc, appTags } = config;
        if (id) return this.ctx.model.AppCenters.update(config, {
            where:{
                id
            }
        });
        return this.ctx.model.AppCenters.create({
            appName,
            appUrl,
            appDesc,
            appTags
        });
    }
    clickApplications (config) {
        const { id, clickCount } = config;
        return this.ctx.model.AppCenters.update({ clickCount: clickCount + 1 }, {
            where:{
                id
            }
        });
    }

    deleteApplications (id) {
        return this.ctx.model.AppCenters.update({
            status:0
        },{
            where:{
                id
            }
        });
    }
}

module.exports = AppCentersService;