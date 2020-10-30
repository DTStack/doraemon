const Service = require('egg').Service;
const _ = require('lodash');

class AppCentersService extends Service {
  addApplications(config) {
    const { id, appName, appUrl, appDesc } = config;
    if (id) return this.ctx.model.AppCenters.update(config, {
      where:{
        id
      }
    });
    return this.ctx.model.AppCenters.create({
      appName,
      appUrl,
      appDesc
    });
  }
}

module.exports = AppCentersService;