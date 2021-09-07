export default {
    /**
     * 通用接口
     */
    //获取github配置仓库中的json
    getAppCentersList: {
        method: 'get',
        url: '/api/appCenters/get-app-list'
    },
    // 更新应用
    updateApplication: {
        method: 'post',
        url: '/api/appCenters/update-applications'
    },
    // 删除应用/*  */
    deleteApplication: {
        method: 'post',
        url: '/api/appCenters/delete-applications'
    },
    clickApplication: {
        method: 'post',
        url: '/api/appCenters/click-applications'
    },
    // 获取应用中心信息
    getApplicationById: {
        method: 'get',
        url: '/api/appCenters/get-app-by-id'
    },
    //获取本机Ip，端口等信息
    getLocalIp: {
        method: 'get',
        url: '/api/github/get-local-ip'
    },

    /**
     * 代理服务
     */
    //获取代理服务列表
    getProxyServerList: {
        method: 'post',
        url: '/api/proxy-server/server-list'
    },
    //添加代理服务
    addProxyServer: {
        method: 'post',
        url: '/api/proxy-server/add-server'
    },
    // 获取目标服务地址列表
    getTargetAddrs: {
        method: 'get',
        url: '/api/proxy-server/target-addrs-list'
    },
    //更新代理服务
    updateProxyServer: {
        method: 'post',
        url: '/api/proxy-server/update-server'
    },
    //删除代理服务
    deleteProxyServer: {
        method: 'delete',
        url: '/api/proxy-server/delete-server'
    },
    //更改代理服务状态
    changeProxyServerStatus: {
        method: 'get',
        url: '/api/proxy-server/change-server-status'
    },
    //获取代理规则列表
    getProxyRuleList: {
        method: 'get',
        url: '/api/proxy-server/rule-list'
    },
    //新增代理规则
    addProxyRule: {
        method: 'post',
        url: '/api/proxy-server/add-rule'
    },
    //更新代理规则
    updateProxyRule: {
        method: 'post',
        url: '/api/proxy-server/update-rule'
    },
    //更新代理规则状态
    updateProxyRuleStatus: {
        method: 'post',
        url: '/api/proxy-server/update-rule-status'
    },
    //删除代理规则
    deleteProxyRule: {
        method: 'delete',
        url: '/api/proxy-server/delete-rule'
    },
    /**
     * 主机管理
     */
    //获取主机列表
    getHostList: {
        method: 'get',
        url: '/api/host-management/host-list'
    },
    //新增主机
    addHost: {
        method: 'post',
        url: '/api/host-management/add-host'
    },
    //编辑主机
    editHost: {
        method: 'post',
        url: '/api/host-management/edit-host'
    },
    //删除主机
    deleteHost: {
        method: 'delete',
        url: '/api/host-management/delete-host'
    },
    /**
     * 配置中心
     */
    getConfigList: {
        method: 'post',
        url: '/api/config-center/config-list'
    },
    addConfig: {
        method: 'post',
        url: '/api/config-center/add-config'
    },
    editConfig: {
        method: 'post',
        url: '/api/config-center/edit-config'
    },
    deleteConfig: {
        method: 'delete',
        url: '/api/config-center/delete-config'
    },
    /**
     * 配置详情
     */
    getConfigDetail: {
        method: 'get',
        url: '/api/config-detail/get-basic-info'
    },
    getConfigNoticeUrlList:{
        method:'get',
        url:'/api/config-detail/get-notice-list'
    },
    addConfigNoticeUrl:{
        method:'post',
        url:'/api/config-detail/add-config-notice-url'
    },
    delNoticeUrl:{
        method:'get',
        url:'/api/config-detail/del-config-notice-url'
    },    
    getRemoteConfig: {
        method: 'get',
        url: '/api/config-detail/get-remote-config'
    },
    saveConfig: {
        method: 'post',
        url: '/api/config-detail/save'
    },
    /**
     * switch hosts 管理列表
     */
    // 获取列表
    getHostsList: {
        method: 'post',
        url: '/api/switch-hosts/get-hosts-list'
    },
    // 创建
    createHosts: {
        method: 'post',
        url: '/api/switch-hosts/create-hosts'
    },
    // 获取详情数据
    getHostsInfo: {
        method: 'get',
        url: '/api/switch-hosts/get-hosts-info'
    },
    // 更新
    updateHosts: {
        method: 'post',
        url: '/api/switch-hosts/update-hosts'
    },
    // 推送
    pushHosts: {
        method: 'post',
        url: '/api/switch-hosts/push-hosts'
    },
    // 删除
    deleteHosts: {
        method: 'post',
        url: '/api/switch-hosts/delete-hosts'
    },
    // 获取所有标签列表
    getAllTagList: {
        method: 'get',
        url: '/api/tags/get-all-tag-list'
    },
    // 获取标签列表
    getTagList: {
        method: 'post',
        url: '/api/tags/get-tag-list'
    },
    // 创建标签
    createTag: {
        method: 'post',
        url: '/api/tags/create-tag'
    },
    // 删除标签
    deleteTag: {
        method: 'post',
        url: '/api/tags/delete-tag'
    },
    // 更新标签
    updateTag: {
        method: 'post',
        url: '/api/tags/update-tag'
    },
    /**
     * 文章订阅
     */
    // 新增
    createSubscription: {
        method: 'post',
        url: '/api/article-subscription/create-subscription'
    },
    // 删除
    deleteSubscription: {
        method: 'post',
        url: '/api/article-subscription/delete-subscription'
    },
    // 编辑
    updateSubscription: {
        method: 'post',
        url: '/api/article-subscription/update-subscription'
    },
    // 获取列表
    getSubscriptionList: {
        method: 'post',
        url: '/api/article-subscription/get-subscription-list'
    },
    // 获取详情
    getSubscriptionInfo: {
        method: 'post',
        url: '/api/article-subscription/get-subscription-info'
    },
    // 获取订阅项列表
    getTopicList: {
        method: 'get',
        url: '/api/article-subscription-topic/get-topic-list'
    }
}
