const config = require('../env.json');
const mysqlConfig = (config && config.mysql && config.mysql.prod) || {};
const { database, host, port, username, password } = mysqlConfig;

/**
 * 生产环境配置
 *
 * 最终生效的配置为 prod + default（前者覆盖后者）
 */


module.exports = () => {
    const exports = {};
    exports.sequelize = {
        datasources: [
            {
                delegate: 'model',
                baseDir: 'model',
                database: database || 'doraemon',
                dialect: 'mysql',
                host: host || '127.0.0.1',
                port: port || 3306,
                username: username || 'root',
                password: password || '',
                // 设置连接池
                pool: {
                    max: 10, //最大连接个数
                    min: 0,
                    acquire: 30000, // 从连接池获取连接的最长等待时间（毫秒）
                    idle: 10000 // 连接池中空闲连接的最长存活时间（毫秒）
                }
            }
        ]
    };
    return exports;
};
