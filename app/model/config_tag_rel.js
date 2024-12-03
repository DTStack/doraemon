module.exports = (app) => {
    const { INTEGER, DATE } = app.Sequelize;
    const ConfigTagRelServer = app.model.define(
        'config_tag_rel',
        {
            id: { type: INTEGER, primaryKey: true, autoIncrement: true },
            configId: { type: INTEGER, field: 'config_id' },
            tagId: { type: INTEGER, field: 'tag_id' },
            created_at: DATE,
            updated_at: DATE,
            is_delete: INTEGER,
        },
        {
            freezeTableName: true,
        }
    );
    return ConfigTagRelServer;
};
