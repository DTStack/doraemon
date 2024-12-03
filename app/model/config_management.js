module.exports = (app) => {
    const { STRING, INTEGER, DATE, TEXT } = app.Sequelize;
    const ConfigManagement = app.model.define(
        'config_management',
        {
            id: { type: INTEGER, primaryKey: true, autoIncrement: true },
            filename: STRING(30),
            filePath: { type: STRING(80), field: 'file_path' },
            tagIds: { type: STRING(100), field: 'tag_ids' },
            hostId: { type: INTEGER, field: 'host_id' },
            remark: STRING(255),
            updateShell: { type: TEXT, field: 'update_shell' },
            status: { type: INTEGER(2), defaultValue: 1 },
            createdAt: DATE,
            updatedAt: DATE,
        },
        {
            freezeTableName: true,
        }
    );
    ConfigManagement.associate = function () {
        app.model.ConfigManagement.belongsTo(app.model.HostManagement, {
            foreignKey: 'host_id',
            targetKey: 'id',
        });
        app.model.ConfigManagement.belongsTo(app.model.TagManagement, {
            as: 'tags',
            foreignKey: 'tag_ids',
            targetKey: 'id',
        });
    };
    return ConfigManagement;
};
