const path = require('path');
const fs = require('fs');
const utils = require('../app/utils');
module.exports = (app) => {
    const exports = {};

    exports.siteFile = {
        '/favicon.ico': fs.readFileSync(path.join(app.baseDir, 'app/web/asset/images/favicon.ico')),
    };
    exports.security = {
        csrf: {
            // ignore: /^\/proxy/
            enable: false,
        },
    };
    exports.cacheDirectory = path.join(__dirname, '../cache');
    exports.bodyParser = {
        ignore: [/^\/proxy/],
        enableTypes: ['json', 'form', 'text'],
    };
    exports.logger = {
        consoleLevel: 'DEBUG',
        dir: path.join(app.baseDir, 'logs'),
    };

    exports.static = {
        prefix: '/public/',
        dir: [
            path.join(app.baseDir, 'public'),
            {
                prefix: '/resources/',
                dir: path.join(app.baseDir, 'resources'),
            },
        ],
    };
    exports.keys = '123456';
    exports.github = {
        owner: 'dtux-kangaroo',
        configRepositoryName: 'ko-config',
    };

    exports.middleware = ['access'];

    exports.onerror = {
        all(err, ctx) {
            // 在此处定义针对所有响应类型的错误处理方法
            // 注意，定义了 config.all 之后，其他错误处理方法不会再生效
            ctx.body = JSON.stringify(utils.response(false, null, err.message));
            ctx.status = 500;
        },
    };

    exports.reactssr = {
        layout: path.join(app.baseDir, 'app/web/view/layout.html'),
    };

    exports.multipart = {
        // 文件上传
        fileSize: '200mb',
        mode: 'file', // 使用文件模式，直接保存到临时文件
        fileExtensions: ['.zip', '.tar', '.gz', '.tgz'], // 允许的文件扩展名
        tmpdir: path.join(app.baseDir, 'cache/uploads'), // 临时文件目录
        fields: 100, // 允许的最多字段数量
        cleanSchedule: {
            // 清理上传的临时文件
            cron: '0 30 4 * * *', // 每天4:30清理
        },
        whitelist: [
            // 允许的文件类型
            '.zip',
            '.tar',
            '.gz',
            '.tgz',
        ],
    };

    exports.io = {
        init: {}, // passed to engine.io
        namespace: {
            '/': {
                connectionMiddleware: ['connection'],
                packetMiddleware: [],
            },
        },
    };

    // 文章订阅每次多少条信息
    exports.articleSubscription = {
        pageSize: 5,
    };

    return exports;
};
