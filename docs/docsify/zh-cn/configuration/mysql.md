# MySQL
## 简介

哆啦A梦使用 **Sequelize** 连接到 MySQL 数据源，具体配置项文件位于 app/config 文件夹，其中分为 本地(local)、生产(prod)、测试(test) 三种环境数据库配置文件，配置项会覆盖和集成默认配置项文件(config.default.js)数据库配置项。
## 步骤

###### 数栈开发环境配置如下
###### 操作步骤

1. 在 app/config 文件夹下添加配置文件，如 config.prod.js
2. 写入相应数据库配置项，如下所示

```
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
                username:'root',
                password:'Admin123!@#'
            }
        ]
    };
    return exports;
};
```