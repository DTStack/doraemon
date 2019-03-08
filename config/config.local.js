
const ip = require('ip');
const EasyWebpack = require('easywebpack-react');
const webpackDevConfig = require('../build/webpack.dev.conf');
module.exports = () => {
  const exports = {};

  exports.static = {
    maxAge: 0 // maxAge 缓存，默认 1 年
  };

  exports.development = {
    watchDirs: ['build'], // 指定监视的目录（包括子目录），当目录下的文件变化的时候自动重载应用，路径从项目根目录开始写
    ignoreDirs: ['app/web', 'public', 'config'] // 指定过滤的目录（包括子目录）
  };

  exports.reactssr = {
    injectCss: true
  };

  exports.webpack = {
    webpackConfigList: EasyWebpack.getWebpackConfig(webpackDevConfig)
  };

  const localIP = ip.address();
  const domainWhiteList = [];
  [9000, 9001, 9002].forEach(port => {
    domainWhiteList.push(`http://localhost:${port}`);
    domainWhiteList.push(`http://127.0.0.1:${port}`);
    domainWhiteList.push(`http://${localIP}:${port}`);
  });

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

  exports.security = { domainWhiteList };

  return exports;
};
