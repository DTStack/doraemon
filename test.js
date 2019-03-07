const httpProxy = require('http-proxy');
const http = require('http');
const proxy = httpProxy.createProxyServer();
const getPort = require('get-port');


async function init(){
  const port =  await getPort();
  const server = http.createServer(function(req, res) {
    // You can define here your custom logic to handle the request
    // and then proxy the request.
    proxy.web(req, res, {target: 'http://47.101.183.209:8788'});
  });
  server.listen(port);
  console.log(port);
}
init();
