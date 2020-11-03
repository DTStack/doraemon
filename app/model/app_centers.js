module.exports = app => {
  const { STRING, INTEGER, DATE } = app.Sequelize;
  const AppCenters = app.model.define('app_centers', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    appName: STRING(100),
    appUrl: STRING(255),
    appDesc: STRING(255),
    status: { type: INTEGER(2), defaultValue: 1 },
    clickCount: { type: INTEGER(2), defaultValue: 0 },
    created_at: DATE,
    updated_at: DATE
  },{
    freezeTableName: true
  });
  return AppCenters;
};
  