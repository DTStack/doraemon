const config = require('../env.json');
const mysqlConfig = (config && config.mysql && config.mysql.test) || {};
const { database, host, port, username, password } = mysqlConfig;

/**
 * 测试环境配置
 *
 * 最终生效的配置为 test + default（前者覆盖后者）
 */
module.exports = () => {
    const exports = {};
    exports.sequelize = {
        datasources:[
            {
                delegate: 'model',
                baseDir: 'model',
                database: database || 'doraemon_test',
                dialect: 'mysql',
                host: host || '127.0.0.1',
                port: port || 3306,
                username: username || 'root',
                password: password || '123456'
            }
        ]
    };
    return exports;
};
