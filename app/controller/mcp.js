const Controller = require('egg').Controller;

const { MCPProxy } = require('../mcp/mcpProxy');

class MCPController extends Controller {
    async handleMCPEndpointPost() {
        const { ctx } = this;
        const { serverId } = ctx.params;
        ctx.respond = false;
        const mcpProxy = MCPProxy.getInstance(ctx.logger);
        await mcpProxy.forwardRequest(serverId, ctx.request, ctx.response);
        await ctx.service.mcp.incrementUseCount(serverId);
    }

    async handleMCPEndpointGet() {
        const { ctx } = this;
        const { serverId } = ctx.params;
        ctx.respond = false;
        const mcpProxy = MCPProxy.getInstance(ctx.logger);
        await mcpProxy.forwardRequest(serverId, ctx.request, ctx.response);
    }

    async handleMCPEndpointDelete() {
        const { ctx } = this;
        const { serverId } = ctx.params;
        const mcpProxy = MCPProxy.getInstance(ctx.logger);
        await mcpProxy.forwardRequest(serverId, ctx.request, ctx.response);
    }

    async getMCPServerList() {
        const { app, ctx } = this;
        const params = ctx.query;
        const data = await ctx.service.mcp.getMCPServerList(params);
        ctx.body = app.utils.response(true, data);
    }

    async getMCPServerDetail() {
        const { app, ctx } = this;
        const { serverId } = ctx.query;
        const data = await ctx.service.mcp.getMCPServerDetail(serverId);
        ctx.body = app.utils.response(true, data);
    }

    async registerMCPServer() {
        const { app, ctx } = this;

        try {
            const body = ctx.request.body;

            let files = [];
            if (ctx.request.files) {
                files = Array.isArray(ctx.request.files) ? ctx.request.files : [ctx.request.files];
            } else if (body.files) {
                files = Array.isArray(body.files) ? body.files : [body.files];
                delete body.files; // 从body中移除，避免重复处理
            }

            ctx.logger.info(
                '注册MCP服务器 - 表单数据:',
                JSON.stringify(Object.keys(body), null, 2)
            );
            ctx.logger.info('注册MCP服务器 - 文件信息:', {
                hasFiles: files.length > 0,
                filesCount: files.length,
                requestFiles: 'files' in ctx.request,
                bodyKeys: Object.keys(body),
            });

            // 处理JSON字段
            if (body.tags && typeof body.tags === 'string') {
                try {
                    body.tags = JSON.parse(body.tags);
                } catch (e) {
                    // 如果解析失败，尝试按数组处理
                    if (body.tags.includes(',')) {
                        body.tags = body.tags.split(',').map((item) => item.trim());
                    }
                }
            }

            if (body.env && typeof body.env === 'string') {
                try {
                    body.env = JSON.parse(body.env);
                } catch (e) {
                    // 解析失败时保持原值
                    ctx.logger.warn('环境变量解析失败:', body.env);
                }
            }

            // 准备数据
            const data = {
                ...body,
                files: Array.isArray(files) ? files : files ? [files] : [],
            };

            const result = await ctx.service.mcp.registerMCPServer(data);
            ctx.body = app.utils.response(true, result, '注册成功');
        } catch (error) {
            ctx.logger.error('MCP服务器注册失败:', error);
            ctx.body = app.utils.response(false, null, error.message);
        }
    }

    async updateMCPServer() {
        const { app, ctx } = this;

        try {
            // 获取表单数据和文件
            const body = ctx.request.body;
            const { serverId } = body;

            let files = [];
            if (ctx.request.files) {
                files = Array.isArray(ctx.request.files) ? ctx.request.files : [ctx.request.files];
            } else if (body.files) {
                files = Array.isArray(body.files) ? body.files : [body.files];
                delete body.files; // 从body中移除，避免重复处理
            }

            ctx.logger.info(
                '更新MCP服务器 - 表单数据:',
                JSON.stringify(Object.keys(body), null, 2)
            );
            ctx.logger.info('更新MCP服务器 - 文件信息:', {
                hasFiles: files.length > 0,
                filesCount: files.length,
                requestFiles: 'files' in ctx.request,
                bodyKeys: Object.keys(body),
            });

            // 处理JSON字段
            if (body.tags && typeof body.tags === 'string') {
                try {
                    body.tags = JSON.parse(body.tags);
                } catch (e) {
                    // 如果解析失败，尝试按数组处理
                    if (body.tags.includes(',')) {
                        body.tags = body.tags.split(',').map((item) => item.trim());
                    }
                }
            }

            if (body.env && typeof body.env === 'string') {
                try {
                    body.env = JSON.parse(body.env);
                } catch (e) {
                    // 解析失败时保持原值
                    ctx.logger.warn('环境变量解析失败:', body.env);
                }
            }

            // 准备数据
            const data = {
                ...body,
                files: Array.isArray(files) ? files : files ? [files] : [],
            };

            const result = await ctx.service.mcp.updateMCPServer(serverId, data);
            ctx.body = app.utils.response(true, result, '更新成功');
        } catch (error) {
            ctx.logger.error('MCP服务器更新失败:', error);
            ctx.body = app.utils.response(false, null, error.message);
        }
    }

    async deleteMCPServer() {
        const { app, ctx } = this;
        const { serverId } = ctx.query;
        await ctx.service.mcp.deleteMCPServer(serverId);
        ctx.body = app.utils.response(true, null, '删除成功');
    }

    async incrementUseCount() {
        const { app, ctx } = this;
        const { serverId } = ctx.request.body;
        await ctx.service.mcp.incrementUseCount(serverId);
        ctx.body = app.utils.response(true, null, '统计成功');
    }

    async getPopularTags() {
        const { app, ctx } = this;
        const data = await app.service.mcp.getPopularTags();
        ctx.body = app.utils.response(true, data);
    }

    async checkMCPServerHealth() {
        const { app, ctx } = this;
        const { serverId } = ctx.query;

        try {
            const isHealthy = await ctx.service.mcp.checkMCPServerHealth(serverId);
            ctx.body = app.utils.response(true, { serverId, healthy: isHealthy });
        } catch (error) {
            ctx.logger.error('MCP服务器健康检查失败:', error);
            ctx.body = app.utils.response(false, null, error.message);
        }
    }

    async cleanupFile() {
        const { app, ctx } = this;
        const { filePath } = ctx.request.body;

        try {
            ctx.service.mcp.cleanupFile(filePath);
            ctx.body = app.utils.response(true, null, '文件清理成功');
        } catch (error) {
            ctx.logger.error('文件清理失败:', error);
            ctx.body = app.utils.response(false, null, error.message);
        }
    }

    async startMCPServer() {
        const { app, ctx } = this;
        const { serverId } = ctx.request.body;

        try {
            await ctx.service.mcp.startMCPServer(serverId);
            ctx.body = app.utils.response(true, null, '服务器启动成功');
        } catch (error) {
            ctx.logger.error('MCP服务器启动失败:', error);
            ctx.body = app.utils.response(false, null, error.message);
        }
    }

    async stopMCPServer() {
        const { app, ctx } = this;
        const { serverId } = ctx.request.body;

        try {
            await ctx.service.mcp.stopMCPServer(serverId);
            ctx.body = app.utils.response(true, null, '服务器停止成功');
        } catch (error) {
            ctx.logger.error('MCP服务器停止失败:', error);
            ctx.body = app.utils.response(false, null, error.message);
        }
    }

    async restartMCPServer() {
        const { app, ctx } = this;
        const { serverId } = ctx.request.body;

        try {
            await ctx.service.mcp.restartMCPServer(serverId);
            ctx.body = app.utils.response(true, null, '服务器重启成功');
        } catch (error) {
            ctx.logger.error('MCP服务器重启失败:', error);
            ctx.body = app.utils.response(false, null, error.message);
        }
    }

    async syncMCPServerInfo() {
        const { app, ctx } = this;
        const { serverId } = ctx.request.body;

        try {
            const serverInfo = await ctx.service.mcp.syncMCPServerInfo(serverId);
            ctx.body = app.utils.response(true, serverInfo, '服务器信息同步成功');
        } catch (error) {
            ctx.logger.error('MCP服务器信息同步失败:', error);
            ctx.body = app.utils.response(false, null, error.message);
        }
    }

    /**
     * 手动检查指定服务器健康状态
     */
    async checkMCPServerHealth() {
        const { app, ctx } = this;
        const { serverId } = ctx.params;

        try {
            const healthResult = await ctx.service.mcp.checkMCPServerHealth(serverId);
            await ctx.service.mcp.updateServerStatus(serverId, healthResult);

            ctx.body = app.utils.response(true, {
                serverId,
                ...healthResult,
                message: '健康检查完成',
            });
        } catch (error) {
            ctx.logger.error(`手动健康检查失败 [${serverId}]:`, error);
            ctx.body = app.utils.response(false, error.message);
        }
    }

    /**
     * 手动检查所有服务器健康状态
     */
    async checkAllMCPServersHealth() {
        const { app, ctx } = this;

        try {
            await ctx.service.mcp.checkAllServersHealth();

            ctx.body = app.utils.response(true, {
                message: '所有服务器健康检查已启动，请稍后查看状态',
            });
        } catch (error) {
            ctx.logger.error('批量健康检查失败:', error);
            ctx.body = app.utils.response(false, error.message);
        }
    }
}
module.exports = MCPController;
