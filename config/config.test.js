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
                database: 'doraemon_test',
                dialect: 'mysql',
                host: '127.0.0.1',
                port: 3306,
                username:'root',
                password:'Admin123!@#'
            }
        ]
    };
    return exports;
};
