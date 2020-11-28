const Controller = require('egg').Controller;
const _ = require('lodash');

class TagsManagementController extends Controller{
  //获取标签列表
  async getTagsList() {
    const { app, ctx } = this;
    const { current, size, searchText } = ctx.request.body;
    if (_.isNil(current)) throw new Error('缺少必要参current');
    if (_.isNil(size)) throw new Error('缺少必要参数size');
    const data = await ctx.service.tagManagement.getTagsList({
      size,
      current,
      searchText
    });
    ctx.body = app.utils.response(true, {
      data: data.rows,
      count: data.count
    });
  }
  //新增标签
  async addTag(){
    const {ctx,app} = this;
    const { tagName,tagDesc,tagColor } = ctx.request.body;
    if(_.isNil(tagName)) throw new Error('缺少必要参数tagName');
    if(_.isNil(tagDesc)) throw new Error('缺少必要参数tagDesc');
    if(_.isNil(tagColor)) throw new Error('缺少必要参数tagColor');
    const result = await ctx.service.tagManagement.addTag({
      tagName,tagDesc,tagColor
    });
    ctx.body = app.utils.response(true,result.get({
      plain: true
    }));
  }
  //编辑标签
  async editTag(){
    const {ctx,app} = this;
    const {id,tagName,tagDesc,tagColor} = ctx.request.body;
    if(_.isNil(id)) throw new Error('缺少必要参数id');
    await ctx.service.tagManagement.editTag({
      id,
      tagName,
      tagDesc,
      tagColor
    });
    ctx.body = app.utils.response(true);
  }
  //删除标签
  async deleteTag(){
    const {ctx,app} = this;
    const {id} = ctx.request.body;
    if(_.isNil(id)) throw new Error('缺少必要参数id');
    await ctx.service.tagManagement.deleteTag(id);
    ctx.body = app.utils.response(true)
  }
}

module.exports = TagsManagementController;