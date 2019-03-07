
module.exports = app => {
  app.get('/', app.controller.home.index);
  app.get('/page/*', app.controller.home.index);
  app.get('/c', app.controller.home.client);
  app.post('/api/proxy-server/list', app.controller.proxyServer.list);
  app.post('/api/proxy-server/add', app.controller.proxyServer.add);
  app.post('/api/proxy-server/update', app.controller.proxyServer.update);
  app.get('/api/proxy-server/change-status', app.controller.proxyServer.changeStatus);
  app.all('/proxy/:id/*', app.controller.proxyServer.proxy);
};
