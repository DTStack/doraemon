const fs = require('fs');
const utils = require('./app/utils');

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

        // 监听 agent 进程发出的信息并作出反应
        app.messenger.on('sendArticleSubscription', (id) => {
            // create an anonymous context to access service
            const ctx = app.createAnonymousContext();
            ctx.runInBackground(async () => {
                await ctx.service.articleSubscription.sendArticleSubscription(id);
            });
        });

        // 监听 MCP 服务器启动结果
        app.messenger.on('mcpStartResult', (data) => {
            const { serverId, success, error } = data;
            const ctx = app.createAnonymousContext();
            ctx.runInBackground(async () => {
                await ctx.service.mcp.handleMCPStartResult(serverId, success, error);
            });
        });

        // 监听 MCP 服务器停止结果
        app.messenger.on('mcpStopResult', (data) => {
            const { serverId, success, error } = data;
            const ctx = app.createAnonymousContext();
            ctx.runInBackground(async () => {
                await ctx.service.mcp.handleMCPStopResult(serverId, success, error);
            });
        });

        // 监听 MCP 服务器重启结果
        app.messenger.on('mcpRestartResult', (data) => {
            const { serverId, success, error } = data;
            const ctx = app.createAnonymousContext();
            ctx.runInBackground(async () => {
                await ctx.service.mcp.handleMCPRestartResult(serverId, success, error);
            });
        });

        // 监听 MCP 服务器健康检查请求
        app.messenger.on('mcpCheckAllServersHealth', () => {
            const ctx = app.createAnonymousContext();
            ctx.runInBackground(async () => {
                await ctx.service.mcp.checkAllServersHealth();
            });
        });

        // 监听 MCP 请求埋点
        app.messenger.on('mcpTraceRequest', (data) => {
            const ctx = app.createAnonymousContext();
            ctx.runInBackground(async () => {
                const { serverId } = data;
                await ctx.service.mcp.incrementUseCount(serverId);
            });
        });
    }
};
