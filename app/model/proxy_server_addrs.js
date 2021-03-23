module.exports = app => {
    const { STRING, INTEGER, DATE } = app.Sequelize;
    const ProxyServer = app.model.define('proxy_server_addrs', {
        id: { type: INTEGER, primaryKey: true, autoIncrement: true },
        target: STRING(255),
        remark: STRING(255),
        proxy_server_id: INTEGER,
        is_delete: INTEGER,
        created_at: DATE,
        updated_at: DATE
    }, {
        freezeTableName: true
    });
    return ProxyServer;
};
