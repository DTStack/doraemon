const http = require('http');
const env = require('./env.json');
const {
    createTimedTask,
    changeTimedTask,
    cancelTimedTask,
    timedTaskList,
    timedTaskResult,
} = require('./app/utils/timedTask');
const { startMcpInspector } = require('./app/agent/mcpInspector');
const { MCPHttpHandler } = require('./app/agent/mcpHttpHandler');
const { MCPProxy } = require('./app/mcp/mcpProxy');
const { buildMCPConfig } = require('./app/utils');

// 接收 app 发送来的消息并作出反应
module.exports = (agent) => {
    // 初始化MCP端点HTTP处理器
    const mcpHttpHandler = new MCPHttpHandler(agent);
    const mcpProxy = new MCPProxy(agent.logger);
    let httpServer = null;

    // 等待Worker进程启动完成后再启动MCP服务
    agent.messenger.once('egg-ready', async () => {
        try {
            agent.logger.info('Worker进程已就绪，开始启动MCP端点HTTP服务...');

            httpServer = await createHttpServer(agent, mcpHttpHandler);

            // 启动所有已注册的MCP代理服务
            await startMCPServices(agent);
        } catch (error) {
            agent.logger.error('MCP端点HTTP服务启动失败:', error);
        }
    });

    // 创建文章订阅任务
    agent.messenger.on('createTimedTask', ({ id, sendCron }) => {
        createTimedTask(id, sendCron, agent);
    });

    // 改变文章订阅任务
    agent.messenger.on('changeTimedTask', ({ id, sendCron }) => {
        changeTimedTask(id, sendCron, agent);
    });

    // 取消文章订阅任务
    agent.messenger.on('cancelTimedTask', ({ id }) => {
        cancelTimedTask(id, agent);
    });

    // 文章订阅任务列表
    agent.messenger.on('timedTaskList', () => {
        timedTaskList(agent);
    });

    // 打印文章订阅任务的执行结果
    agent.messenger.on('timedTaskResult', ({ result }) => {
        timedTaskResult(result, agent);
    });

    // 处理MCP服务器启动请求
    agent.messenger.on('mcpStart', async ({ serverId, config }) => {
        try {
            await mcpProxy.startProxy(serverId, config);
            agent.logger.info(`MCP服务器启动成功 [${serverId}]`);

            // 发送成功消息回 worker
            agent.messenger.sendRandom('mcpStartResult', {
                serverId,
                success: true,
            });
        } catch (error) {
            agent.logger.error(`MCP服务器启动失败 [${serverId}]:`, error);

            // 发送失败消息回 worker
            agent.messenger.sendRandom('mcpStartResult', {
                serverId,
                success: false,
                error: error.message,
            });
        }
    });

    // 处理MCP服务器停止请求
    agent.messenger.on('mcpStop', async ({ serverId }) => {
        try {
            await mcpProxy.stopProxy(serverId);
            agent.logger.info(`MCP服务器停止成功 [${serverId}]`);

            // 发送成功消息回 worker
            agent.messenger.sendToApp('mcpStopResult', {
                serverId,
                success: true,
            });
        } catch (error) {
            agent.logger.error(`MCP服务器停止失败 [${serverId}]:`, error);

            // 发送失败消息回 worker
            agent.messenger.sendRandom('mcpStopResult', {
                serverId,
                success: false,
                error: error.message,
            });
        }
    });

    // 处理MCP服务器重启请求
    agent.messenger.on('mcpRestart', async ({ serverId }) => {
        try {
            await mcpProxy.restartProxy(serverId);
            agent.logger.info(`MCP服务器重启成功 [${serverId}]`);

            // 发送成功消息回 worker
            agent.messenger.sendRandom('mcpRestartResult', {
                serverId,
                success: true,
            });
        } catch (error) {
            agent.logger.error(`MCP服务器重启失败 [${serverId}]:`, error);

            // 发送失败消息回 worker
            agent.messenger.sendRandom('mcpRestartResult', {
                serverId,
                success: false,
                error: error.message,
            });
        }
    });

    // 启动MCP Inspector
    startMcpInspector(agent);

    // 进程退出前清理
    agent.beforeClose(async () => {
        agent.logger.info('Agent进程关闭，清理MCP服务...');

        try {
            // 关闭HTTP服务器
            if (httpServer) {
                await new Promise((resolve) => {
                    httpServer.close(() => {
                        resolve();
                    });
                });
            }

            // 清理MCP代理
            await mcpProxy.cleanup();
            agent.logger.info('MCP服务清理完成');
        } catch (error) {
            agent.logger.error('MCP服务清理失败:', error);
        }
    });
};

// 创建HTTP服务（用于处理MCP端点请求）
async function createHttpServer(agent, mcpHttpHandler) {
    const port = env.mcpEndpointPort || 7005;

    const server = http.createServer(async (req, res) => {
        await mcpHttpHandler.handleRequest(req, res);
    });

    server.listen(port, () => {
        agent.logger.info(`MCP端点HTTP服务已启动，监听端口: ${port}`);
    });

    server.on('error', (error) => {
        agent.logger.error('MCP端点HTTP服务错误:', error);
    });

    return server;
}

// 启动所有MCP服务，缓存配置信息
async function startMCPServices(agent) {
    agent.logger.info('开始启动MCP服务...');

    const ctx = agent.createAnonymousContext();

    // 获取所有未删除的MCP服务器
    const enabledServers = await ctx.model.McpServer.findAll({
        where: {
            is_delete: 0,
        },
    });

    if (enabledServers.length === 0) {
        agent.logger.info('无需要启动的MCP服务器');
        return;
    }

    agent.logger.info(`启动${enabledServers.length}个MCP服务器...`);

    let successCount = 0;
    let failCount = 0;

    // 启动每个服务器
    for (const server of enabledServers) {
        try {
            // 构建MCP配置对象
            const config = buildMCPConfig(server);
            await MCPProxy.getInstance().startProxy(server.server_id, config);

            successCount++;
        } catch (error) {
            agent.logger.error(`MCP服务器启动失败 [${server.server_id}]:`, error);

            // 更新状态为错误
            await server.update({
                status: 'error',
                ping_error: error.message,
                last_ping_at: new Date(),
            });

            failCount++;
        }
    }

    setTimeout(() => {
        agent.messenger.sendRandom('mcpCheckAllServersHealth');
    }, 2000);

    agent.logger.info(`MCP服务启动完成: 成功${successCount}个, 失败${failCount}个`);
}
