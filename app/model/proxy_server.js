module.exports = app => {
  const { STRING, INTEGER, DATE } = app.Sequelize;
 
  const ProxyServer = app.model.define('proxy_server', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    pid: INTEGER,
    name: INTEGER,
    target:STRING(60),
    created_at: DATE,
    updated_at: DATE,
  },{
    freezeTableName: true
  });

 
  return ProxyServer;
};
