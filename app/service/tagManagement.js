const _ = require('lodash');
const Service = require('egg').Service;

class TagManagementService extends Service {
    // 获取列表数据
    getTagsList(reqParams) {
        const { size, current, searchText } = reqParams;
        return this.ctx.model.TagManagement.findAndCountAll({
            where: {
                tagName: {
                    $like: `%${searchText}%`,
                },
                is_delete: 0,
            },
            limit: size,
            order: [['updated_at', 'DESC']],
            offset: size * (current - 1),
        });
    }
    // 获取列表数据
    getAllTagsList(reqParams) {
        const { searchText = '' } = reqParams;
        return this.ctx.model.TagManagement.findAndCountAll({
            where: {
                tagName: {
                    $like: `%${searchText}%`,
                },
                is_delete: 0,
            },
        });
    }
    addTag(params) {
        const { ctx } = this;
        return ctx.model.TagManagement.create(params);
    }
    editTag(params) {
        const { ctx } = this;
        const { id, tagName, tagDesc, tagColor } = params;
        const newParams = {};
        if (!_.isNil(tagName)) newParams.tagName = tagName;
        if (!_.isNil(tagDesc)) newParams.tagDesc = tagDesc;
        if (!_.isNil(tagColor)) newParams.tagColor = tagColor;
        return ctx.model.TagManagement.update(newParams, {
            where: {
                id,
            },
        });
    }
    deleteTag(id) {
        const { ctx } = this;
        return ctx.model.TagManagement.update(
            {
                is_delete: 1,
            },
            {
                where: {
                    id,
                },
            }
        );
    }
}
module.exports = TagManagementService;
