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
        this.requestManager = new MCPRequestManager(logger);
        this.processManager = new MCPProcessManager(logger);
        this.transportHandlers = new Map();

        // 传输处理器实例
        this.stdioHandler = new StdioTransportHandler(
            this.processManager,
            this.requestManager,
            logger
        );
        this.sseHandler = new SSETransportHandler(logger);
        this.httpHandler = new StreamableHttpTransportHandler(logger);

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
        } catch (error) {
            this.logger?.error(`启动代理失败 [${serverId}]:`, error);
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
        } catch (error) {
            this.logger?.error(`停止代理失败 [${serverId}]:`, error);
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
            this.logger?.error(`服务器未运行 [${serverId}]`);
            throw new Error(`服务器 ${serverId} 未运行`);
        }

        try {
            await handler.forward(serverId, request, response);
        } catch (error) {
            this.logger?.error(`转发请求失败 [${serverId}]:`, error);
            throw error;
        }
    }

    async restartProxy(serverId) {
        const handler = this.transportHandlers.get(serverId);
        if (!handler) {
            this.logger?.error(`重启失败 [${serverId}]: 服务器不存在`);
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
            } catch (error) {
                this.logger?.error(`重启失败 [${serverId}]:`, error);
                throw error;
            }
        } else {
            const error = new Error(`服务器类型不支持重启: ${serverId}`);
            this.logger?.error(`重启失败 [${serverId}]:`, error);
            throw error;
        }
    }

    async cleanup() {
        const serverIds = Array.from(this.transportHandlers.keys());

        if (serverIds.length === 0) {
            return;
        }

        try {
            await Promise.all(serverIds.map((serverId) => this.stopProxy(serverId)));
            await this.processManager.cleanup();
        } catch (error) {
            this.logger?.error('清理失败:', error);
            throw error;
        }
    }
}

module.exports = { MCPProxy };
