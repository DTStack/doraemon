/**
 * 生产环境配置
 *
 * 最终生效的配置为 prod + default（前者覆盖后者）
 */


module.exports = () => {
  const exports = {};
  exports.sequelize = {
    datasources:[
      {
        delegate: 'model',
        baseDir: 'model',
        database: 'doraemon',
        dialect: 'mysql',
        host: '127.0.0.1',
        port: 3306,
        username:'blackrose',
        password:'admin123'
      }
    ]
  };
  return exports;
};
