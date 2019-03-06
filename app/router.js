
module.exports = app => {
  app.get('/', app.controller.home.index);
  app.get('/page/*', app.controller.home.index);
  app.get('/c', app.controller.home.client);
  app.get('/api/article/list', app.controller.home.pager);
  app.get('/api/list', app.controller.proxyServer.create);
};
