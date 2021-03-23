module.exports = app => {
    const { STRING, INTEGER, DATE } = app.Sequelize;
    const SwitchHostsServer = app.model.define('switch_hosts', {
        id: { type: INTEGER, primaryKey: true, autoIncrement: true },
        groupName: STRING(64),
        groupId: STRING(255),
        groupApi: STRING(255),
        groupDesc: STRING(255),
        groupAddr: STRING(255),
        created_at: DATE,
        updated_at: DATE,
        is_delete: INTEGER,
        is_close: INTEGER,
        is_push: INTEGER
    },{
        freezeTableName: true
    });
    return SwitchHostsServer;
};
  