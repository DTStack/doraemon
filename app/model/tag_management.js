module.exports = app => {
  const { STRING, INTEGER, DATE } = app.Sequelize;
  const TagManagementServer = app.model.define('tag_management', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    tagName: STRING(64),
    tagDesc: STRING(255),
    tagColor: STRING(255),
    created_at: DATE,
    updated_at: DATE,
    is_delete: INTEGER,
    is_close: INTEGER
  },{
    freezeTableName: true
  });
  return TagManagementServer;
};
  