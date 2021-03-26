const path = require('path');
const fs = require('fs');
const utils = require('../app/utils');
module.exports = app => {
    const exports = {};

    exports.siteFile = {
        '/favicon.ico': fs.readFileSync(path.join(app.baseDir, 'app/web/asset/images/favicon.ico'))
    };
    exports.security = {
        csrf: {
            ignore: /^\/proxy/
        }
    };
    exports.cacheDirectory = path.join(__dirname,'../cache')
    exports.bodyParser = {
        ignore:[/^\/proxy/]
    }
    exports.logger = {
        consoleLevel: 'DEBUG',
        dir: path.join(app.baseDir, 'logs')
    };

    exports.static = {
        prefix: '/public/',
        dir: [path.join(app.baseDir, 'public'),{
            prefix: '/resources/',
            dir: path.join(app.baseDir, 'resources')
        }]
    };
    exports.keys = '123456';
    exports.github = {
        owner:'dtux-kangaroo',
        configRepositoryName:'ko-config'
    }

    exports.middleware = [
        'access'
    ];

    exports.onerror={
        all(err, ctx) {
            // 在此处定义针对所有响应类型的错误处理方法
            // 注意，定义了 config.all 之后，其他错误处理方法不会再生效
            ctx.body = JSON.stringify(utils.response(false,null,err.message));
            ctx.status = 500;
        }
    }

    exports.reactssr = {
        layout: path.join(app.baseDir, 'app/web/view/layout.html')
    };

    exports.multipart = { // 文件上传
        fileSize: '50mb',
        mode: 'stream'
    }

    return exports;
};
