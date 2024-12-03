module.exports = (app) => {
    const { INTEGER, STRING } = app.Sequelize;
    const ConfigNoticeUrl = app.model.define(
        'config_notice_url',
        {
            id: { type: INTEGER, primaryKey: true, autoIncrement: true },
            webHook: STRING(255),
            type: STRING(255),
            accept_group: STRING(255),
            is_delete: INTEGER,
            configId: { type: INTEGER, field: 'config_id' },
        },
        {
            freezeTableName: true,
            timestamps: false,
        }
    );
    return ConfigNoticeUrl;
};
