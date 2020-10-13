const Controller = require('egg').Controller;

class AppCentersController extends Controller{
  async getAppCenterList(){
    const {app,ctx} = this;
    const result = await app.model.AppCenters.findAndCountAll({
        attributes:['id','appName','appDesc','appUrl','created_at','updated_at'],
        order:[['updated_at','DESC']],
      });
    ctx.body = app.utils.response(true,{data:result.rows,count:result.count});
  }
}
module.exports = AppCentersController;