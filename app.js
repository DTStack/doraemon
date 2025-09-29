const fs = require('fs');
const utils = require('./app/utils');
const { MCPProxy } = require('./app/mcp/mcpProxy');

module.exports = class AppBootHook {
    constructor(app) {
        this.app = app;
    }
    async serverDidReady() {
        const { app } = this;
        app.utils = utils;
        const { cacheDirectory } = app.config;
        if (!fs.existsSync(cacheDirectory)) {
            fs.mkdirSync(cacheDirectory);
        }

        // 启动MCP服务
        await this.startMCPServices();

        // 监听 agent 进程发出的信息并作出反应
        app.messenger.on('sendArticleSubscription', (id) => {
            // create an anonymous context to access service
            const ctx = app.createAnonymousContext();
            ctx.runInBackground(async () => {
                await ctx.service.articleSubscription.sendArticleSubscription(id);
            });
        });
    }

    /**
     * 启动MCP服务
     */
    async startMCPServices() {
        const { app } = this;
        const ctx = app.createAnonymousContext();
        
        try {
            app.logger.info('开始启动MCP服务...');
            
            // 获取所有启用的MCP服务器
            const enabledServers = await ctx.model.McpServer.findAll({
                where: {
                    is_delete: 0,
                }
            });

            if (enabledServers.length === 0) {
                app.logger.info('没有找到需要启动的MCP服务器');
                return;
            }

            app.logger.info(`找到 ${enabledServers.length} 个需要启动的MCP服务器`);
            
            // 启动每个服务器
            const startPromises = enabledServers.map(async (server) => {
               await ctx.service.mcp.startMCPServer(server.server_id).catch(err => {
                    app.logger.error(`MCP服务器启动失败 [${server.server_id}]:`, err.message);
               });
            });

            await Promise.all(startPromises);
        } catch (error) {
            app.logger.error('MCP服务启动过程中发生错误:', error);
        }
    }

    /**
     * 构建MCP配置对象
     * @param {Object} server - 数据库中的服务器记录
     * @returns {Object} MCP配置对象
     */
    buildMCPConfig(server) {
        const config = {
            transport: {
                type: server.transport
            }
        };

        if (server.transport === 'stdio') {
            config.command = server.command;
            config.args = server.args || [];
            config.env = server.env || {};
            config.cwd = server.deploy_path; // 设置工作目录为部署路径
        } else if (server.transport === 'streamable-http') {
            config.httpUrl = server.http_url;
        } else if (server.transport === 'sse') {
            config.sseUrl = server.sse_url;
        }

        return config;
    }

    /**
     * 应用关闭时的清理工作
     */
    async beforeClose() {
        const { app } = this;
        
        try {
            app.logger.info('开始清理MCP服务...');
            
            // 获取MCP代理实例并清理
            const mcpProxy = MCPProxy.getInstance();
            await mcpProxy.cleanup();
            
            // 销毁单例实例
            MCPProxy.destroyInstance();
            
            app.logger.info('MCP服务清理完成');
        } catch (error) {
            app.logger.error('MCP服务清理过程中发生错误:', error);
        }
    }
};
