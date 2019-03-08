const httpProxy = require('http-proxy');
const http = require('http');
const proxy = httpProxy.createProxyServer();

console.log(process.argv);
const target = process.argv[3];
const port = process.argv[4];
const server = http.createServer(function(req, res) {
  proxy.web(req, res, {target});
});
server.listen(port);
console.log('代理服务启动成功');