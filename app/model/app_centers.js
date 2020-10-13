module.exports = app => {
    const { STRING, INTEGER, DATE } = app.Sequelize;
    const AppCenters = app.model.define('app_centers', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      name:  STRING(100),
      url:STRING(255),
      desc: STRING(255),
      status: INTEGER,
      created_at: DATE,
      updated_at: DATE
    },{
      freezeTableName: true
    });
    return AppCenters;
  };
  