module.exports = app => {
  const { STRING, INTEGER, DATE } = app.Sequelize;
  const HostManagement = app.model.define('host_management', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    hostIp:{type:STRING(20),field:'host_ip'},
    hostName:{type:STRING(60),field:'host_name'},
    username:STRING(60),
    password:STRING(60),
    remark: STRING(255),
    tags:{type:STRING(60),field:'tag_ids'},
    status: {type:INTEGER(2),defaultValue:1},
    createdAt: DATE,
    updatedAt: DATE
  },{
    freezeTableName: true
  });

  return HostManagement;
};
