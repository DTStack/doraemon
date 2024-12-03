module.exports = (app) => {
    const { STRING, INTEGER, DATE } = app.Sequelize;
    const ProxyServer = app.model.define(
        'proxy_server',
        {
            id: { type: INTEGER, primaryKey: true, autoIncrement: true },
            name: INTEGER,
            target: STRING(60),
            api_doc_url: STRING(255),
            proxy_server_address: STRING(100),
            status: INTEGER,
            is_delete: INTEGER,
            created_at: DATE,
            updated_at: DATE,
        },
        {
            freezeTableName: true,
        }
    );
    return ProxyServer;
};
