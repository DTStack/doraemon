
module.exports = app => {
  app.get('/', app.controller.home.index);
  app.get('/page/*', app.controller.home.index);
  app.get('/c', app.controller.home.client);
   /**
   * 代理服务增删改查以及状态修改
   */
  app.post('/api/proxy-server/server-list', app.controller.proxy.list);
  app.post('/api/proxy-server/add-server', app.controller.proxy.add);
  app.post('/api/proxy-server/update-server', app.controller.proxy.update);
  app.delete('/api/proxy-server/delete-server',app.controller.proxy.delete)
  app.get('/api/proxy-server/change-server-status', app.controller.proxy.changeStatus);
  /**
   * 代理服务规则增删改查
   */
  app.get('/api/proxy-server/rule-list', app.controller.proxy.ruleList);
  app.post('/api/proxy-server/add-rule', app.controller.proxy.addRule);
  app.post('/api/proxy-server/update-rule', app.controller.proxy.updateRule);
  app.delete('/api/proxy-server/delete-rule', app.controller.proxy.deleteRule);
  /**
   * 服务代理
   */
  app.all('/proxy/:id/*', app.middleware.proxy);
};
