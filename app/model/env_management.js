module.exports = (app) => {
    const { STRING, INTEGER, DATE } = app.Sequelize;
    const EnvManagement = app.model.define(
        'env_management',
        {
            id: { type: INTEGER, primaryKey: true, autoIncrement: true },
            envName: { type: STRING(255), field: 'env_name' },
            hostIp: { type: STRING(20), field: 'host_ip' },
            uicUsername: { type: STRING(255), field: 'uic_username' },
            uicPasswd: { type: STRING(255), field: 'uic_passwd' },
            url: { type: STRING(2048), field: 'url' },
            remark: STRING(255),
            tags: { type: STRING(60), field: 'tag_ids' },
            status: { type: INTEGER(2), defaultValue: 1 },
            createdAt: DATE,
            updatedAt: DATE,
        },
        {
            freezeTableName: true,
        }
    );

    return EnvManagement;
};
