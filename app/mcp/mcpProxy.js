const { MCPRequestManager } = require('./mcpRequestManager.js');
const { MCPProcessManager } = require('./mcpProcessManager.js');
const {
    StdioTransportHandler,
    SSETransportHandler,
    StreamableHttpTransportHandler,
} = require('./transportHandlers.js');

class MCPProxy {
    constructor(logger = null) {
        if (MCPProxy.instance) {
            return MCPProxy.instance;
        }

        this.logger = logger;
        this.requestManager = new MCPRequestManager();
        this.processManager = new MCPProcessManager(logger);
        this.transportHandlers = new Map();
        this.connections = new Map();

        // 传输处理器实例
        this.stdioHandler = new StdioTransportHandler(this.processManager, this.requestManager);
        this.sseHandler = new SSETransportHandler();
        this.httpHandler = new StreamableHttpTransportHandler();

        // 保存实例
        MCPProxy.instance = this;
    }

    /**
     * 获取单例实例
     * @param {Object} logger - 可选的日志记录器
     * @returns {MCPProxy}
     */
    static getInstance(logger = null) {
        if (!MCPProxy.instance) {
            MCPProxy.instance = new MCPProxy(logger);
        }
        return MCPProxy.instance;
    }

    /**
     * 销毁单例实例
     */
    static destroyInstance() {
        if (MCPProxy.instance) {
            MCPProxy.instance.cleanup();
            MCPProxy.instance = null;
        }
    }

    async startProxy(serverId, config) {
        try {
            // 停止已存在的代理
            await this.stopProxy(serverId);

            const transport = config.transport || { type: 'stdio' };
            let handler;

            // 选择合适的传输处理器
            switch (transport.type) {
                case 'stdio':
                    handler = this.stdioHandler;
                    break;
                case 'sse':
                    handler = this.sseHandler;
                    break;
                case 'streamable-http':
                    handler = this.httpHandler;
                    break;
                default:
                    throw new Error(`不支持的传输类型: ${transport.type}`);
            }

            // 启动传输处理器
            await handler.start(serverId, config);

            // 记录使用的处理器
            this.transportHandlers.set(serverId, handler);

            console.log(`MCP代理已启动: ${serverId} (${transport.type})`);
        } catch (error) {
            console.error(`启动MCP代理失败 [${serverId}]:`, error);
            throw error;
        }
    }

    /**
     * 停止代理
     * @param {string} serverId - 服务器ID
     * @returns {Promise<void>}
     */
    async stopProxy(serverId) {
        try {
            // 停止传输处理器
            const handler = this.transportHandlers.get(serverId);
            if (handler) {
                await handler.stop(serverId);
                this.transportHandlers.delete(serverId);
            }

            // 清理连接
            this.connections.delete(serverId);

        } catch (error) {
            console.error(`停止MCP代理失败 [${serverId}]:`, error);
            throw error;
        }
    }

    /**
     * 处理HTTP请求到MCP的转发
     * @param {string} serverId - 服务器ID
     * @param {any} request - 请求对象
     * @param {object} response - 响应对象
     */
    async forwardRequest(serverId, request, response) {
        const handler = this.transportHandlers.get(serverId);
        if (!handler) {
            throw new Error(`服务器 ${serverId} 未运行`);
        }

        try {
            console.log(`转发请求到服务器 [${serverId}]:`, {
                method: request.body.method,
                id: request.body.id,
                hasParams: !!request.body.params,
            });

            await handler.forward(serverId, request, response);
        } catch (error) {
            console.error(`请求转发失败 [${serverId}]:`, error);
            throw error;
        }
    }

    getProxyStatus(serverId) {
        const handler = this.transportHandlers.get(serverId);
        const connections = this.connections.get(serverId)?.size || 0;

        const status = {
            serverId,
            status: handler?.isRunning(serverId) ? 'running' : 'stopped',
            connections,
        };

        return status;
    }

    getAllProxyStatus() {
        const statuses = {};

        for (const serverId of this.transportHandlers.keys()) {
            statuses[serverId] = this.getProxyStatus(serverId);
        }

        return statuses;
    }

    /**
     * 添加客户端连接
     * @param {string} serverId - 服务器ID
     * @param {any} connection - 连接对象
     */
    addConnection(serverId, connection) {
        if (!this.connections.has(serverId)) {
            this.connections.set(serverId, new Set());
        }
        this.connections.get(serverId).add(connection);
        console.log(
            `添加客户端连接 [${serverId}], 当前连接数: ${this.connections.get(serverId).size}`
        );
    }

    /**
     * 移除客户端连接
     * @param {string} serverId - 服务器ID
     * @param {any} connection - 连接对象
     */
    removeConnection(serverId, connection) {
        const connections = this.connections.get(serverId);
        if (connections) {
            connections.delete(connection);
            console.log(`移除客户端连接 [${serverId}], 当前连接数: ${connections.size}`);

            if (connections.size === 0) {
                this.connections.delete(serverId);
            }
        }
    }

    async restartProxy(serverId) {
        const handler = this.transportHandlers.get(serverId);
        if (!handler) {
            throw new Error(`服务器 ${serverId} 不存在`);
        }

        // 对于STDIO类型，可以重启进程
        if (handler === this.stdioHandler) {
            try {
                await this.processManager.restartStdioProcess(
                    serverId,
                    (data) => this.stdioHandler.handleProcessData(serverId, data),
                    (error) => this.stdioHandler.handleProcessError(serverId, error),
                    (code, signal) => this.stdioHandler.handleProcessExit(serverId, code, signal)
                );
                console.log(`STDIO服务器重启成功: ${serverId}`);
            } catch (error) {
                console.error(`STDIO服务器重启失败 [${serverId}]:`, error);
                throw error;
            }
        } else {
            throw new Error(`服务器类型不支持重启: ${serverId}`);
        }
    }

    async cleanup() {
        console.log('开始清理所有MCP代理...');

        const serverIds = Array.from(this.transportHandlers.keys());
        await Promise.all(serverIds.map((serverId) => this.stopProxy(serverId)));

        // 清理底层管理器
        await this.processManager.cleanup();

        console.log('MCP代理清理完成');
    }
}

module.exports = { MCPProxy };
