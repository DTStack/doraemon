module.exports = app => {
  const { INTEGER,STRING} = app.Sequelize;
  const ConfigNoticeUrl = app.model.define('config_notice_url', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    url:STRING(255),
    configId:{type:INTEGER,field:'config_id'},
  },{
    freezeTableName: true,
    timestamps: false,
  });
  return ConfigNoticeUrl;
};