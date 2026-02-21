module.exports = (app) => {
    // const { io } = app;
    app.get('/', app.controller.home.index);
    app.get('/page/*', app.controller.home.index);
    app.get('/c', app.controller.home.client);
    /**
     * 代理服务增删改查以及状态修改
     */
    app.post('/api/proxy-server/server-list', app.controller.proxy.list);
    app.post('/api/proxy-server/add-server', app.controller.proxy.add);
    app.get('/api/proxy-server/target-addrs-list', app.controller.proxy.getTargetAddrs);
    app.post('/api/proxy-server/update-server', app.controller.proxy.update);
    app.delete('/api/proxy-server/delete-server', app.controller.proxy.delete);
    app.get('/api/proxy-server/change-server-status', app.controller.proxy.changeStatus);
    /**
     * 代理服务规则增删改查
     */
    app.get('/api/proxy-server/rule-list', app.controller.proxy.ruleList);
    app.post('/api/proxy-server/add-rule', app.controller.proxy.addRule);
    app.post('/api/proxy-server/update-rule', app.controller.proxy.updateRule);
    app.post('/api/proxy-server/update-rule-status', app.controller.proxy.updateRuleStatus);
    app.delete('/api/proxy-server/delete-rule', app.controller.proxy.deleteRule);
    app.post(
        '/api/proxy-server/get-project-list-by-user-ip',
        app.controller.proxy.projectListByUserIP
    );
    /**
     * 主机管理
     */
    app.get('/api/host-management/host-list', app.controller.hostManagement.queryHosts);
    app.post('/api/host-management/add-host', app.controller.hostManagement.addHost);
    app.post('/api/host-management/edit-host', app.controller.hostManagement.editHost);
    app.delete('/api/host-management/delete-host', app.controller.hostManagement.deleteHost);
    /**
     * 环境管理
     */
    app.get('/api/env-management/env-list', app.controller.envManagement.queryEnvs);
    app.post('/api/env-management/add-env', app.controller.envManagement.addEnv);
    app.post('/api/env-management/edit-env', app.controller.envManagement.editEnv);
    app.delete('/api/env-management/delete-env', app.controller.envManagement.deleteEnv);
    /**
     * 配置中心
     */
    app.post('/api/config-center/config-list', app.controller.configCenter.getConfigList);
    app.post('/api/config-center/add-config', app.controller.configCenter.addConfig);
    app.post('/api/config-center/edit-config', app.controller.configCenter.editConfig);
    app.delete('/api/config-center/delete-config', app.controller.configCenter.deleteConfig);
    /**
     * 配置详情
     */
    app.get('/api/config-detail/get-basic-info', app.controller.configDetail.getBasicInfo);
    app.get('/api/config-detail/get-notice-list', app.controller.configDetail.getNoticeList);
    app.post('/api/config-detail/add-config-notice-url', app.controller.configDetail.addNoticeUrl);
    app.get('/api/config-detail/del-config-notice-url', app.controller.configDetail.delNoticeUrl);
    app.get('/api/config-detail/get-remote-config', app.controller.configDetail.getRemoteConfig);
    app.post('/api/config-detail/save', app.controller.configDetail.saveConfig);
    /**
     * 服务代理
     */
    app.all('/proxy/:id/*', app.middleware.proxy);
    /**
     * 通用接口
     */
    app.get('/api/appCenters/get-app-list', app.controller.appCenters.getAppCenterList);
    app.get('/api/github/get-local-ip', app.controller.common.getLocalIp);
    app.post('/api/appCenters/update-applications', app.controller.appCenters.updateApplications);
    app.post('/api/appCenters/delete-applications', app.controller.appCenters.deleteApplications);
    app.post('/api/appCenters/click-applications', app.controller.appCenters.clickApplications);
    app.get('/api/appCenters/get-app-by-id', app.controller.appCenters.getApplicationById);
    app.post('/api/appCenters/upload-logo/:id', app.controller.appCenters.uploadLogo);
    /**
     * switch hosts 管理列表
     */
    app.post('/api/switch-hosts/get-hosts-list', app.controller.switchHosts.getHostsList);
    app.post('/api/switch-hosts/push-hosts', app.controller.switchHosts.pushHosts);
    /**
     * switch hosts 配置内容 增删改查
     */
    app.post('/api/switch-hosts/create-hosts', app.controller.switchHosts.createHosts);
    app.post('/api/switch-hosts/delete-hosts', app.controller.switchHosts.deleteHosts);
    app.post('/api/switch-hosts/update-hosts', app.controller.switchHosts.updateHosts);
    app.get('/api/switch-hosts/get-hosts-info', app.controller.switchHosts.getHostsInfo);
    app.get('/api/switch-hosts/connect/:id', app.controller.switchHosts.getHostsConfig);

    /**
     * 文章订阅
     */
    app.get(
        '/api/article-subscription/test-article',
        app.controller.articleSubscription.testArticle
    );
    app.post(
        '/api/article-subscription/create-subscription',
        app.controller.articleSubscription.createSubscription
    );
    app.post(
        '/api/article-subscription/delete-subscription',
        app.controller.articleSubscription.deleteSubscription
    );
    app.post(
        '/api/article-subscription/update-subscription',
        app.controller.articleSubscription.updateSubscription
    );
    app.post(
        '/api/article-subscription/get-subscription-list',
        app.controller.articleSubscription.getSubscriptionList
    );
    app.get(
        '/api/article-subscription/get-subscription-info',
        app.controller.articleSubscription.getSubscriptionInfo
    );
    app.get(
        '/api/article-subscription/get-timed-task-list',
        app.controller.articleSubscription.getTimedTaskList
    );
    app.get('/api/article-topic/get-topic-list', app.controller.articleTopic.getTopicList);

    /**
     * tag management 配置内容 增删改查
     */
    app.get('/api/tags/get-all-tag-list', app.controller.tagManagement.getAllTagsList);
    app.post('/api/tags/get-tag-list', app.controller.tagManagement.getTagsList);
    app.post('/api/tags/create-tag', app.controller.tagManagement.addTag);
    app.post('/api/tags/update-tag', app.controller.tagManagement.editTag);
    app.post('/api/tags/delete-tag', app.controller.tagManagement.deleteTag);

    /**
     * MCP服务器注册中心路由
     */
    app.get('/api/mcp-servers/list', app.controller.mcp.getMCPServerList);
    app.get('/api/mcp-servers/detail', app.controller.mcp.getMCPServerDetail);
    app.post('/api/mcp-servers/register', app.controller.mcp.registerMCPServer);
    app.put('/api/mcp-servers/update', app.controller.mcp.updateMCPServer);
    app.delete('/api/mcp-servers/delete', app.controller.mcp.deleteMCPServer);
    app.post('/api/mcp-servers/use', app.controller.mcp.incrementUseCount);
    app.get('/api/mcp-servers/tags/popular', app.controller.mcp.getPopularTags);
    app.get('/api/mcp-servers/health', app.controller.mcp.checkMCPServerHealth);

    // MCP服务器生命周期管理
    app.post('/api/mcp-servers/start', app.controller.mcp.startMCPServer);
    app.post('/api/mcp-servers/stop', app.controller.mcp.stopMCPServer);
    app.post('/api/mcp-servers/restart', app.controller.mcp.restartMCPServer);
    app.post('/api/mcp-servers/sync-info', app.controller.mcp.syncMCPServerInfo);

    // MCP服务器健康检查路由
    app.post('/api/mcp-servers/health/:serverId', app.controller.mcp.checkMCPServerHealth);
    app.post('/api/mcp-servers/health/all', app.controller.mcp.checkAllMCPServersHealth);

    /**
     * Skills 市场
     */
    app.get('/api/skills/list', app.controller.skills.getSkillList);
    app.get('/api/skills/detail', app.controller.skills.getSkillDetail);
    app.get('/api/skills/related', app.controller.skills.getRelatedSkills);

    // io.of('/').route('getShellCommand',  io.controller.home.getShellCommand)
    // 暂时close Terminal相关功能
    // io.of('/').route('loginServer',  io.controller.home.loginServer)
};
