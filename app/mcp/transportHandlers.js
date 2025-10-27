const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const {
    StreamableHTTPClientTransport,
} = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const {
    StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const env = require('../../env.json');

/** STDIO 消息响应超时时间 */
const STDIO_MESSAGE_RESPONSE_TIMEOUT = 60000;

class BaseTransportHandler {
    constructor(logger) {
        this.logger = logger;
    }

    /**
     * 启动服务，记录传输配置
     * @param {string} serverId - 服务器ID
     * @param {object} config - 配置
     */
    // @ts-ignore
    start() {
        throw new Error('Start Method Not Implemented');
    }

    /**
     * 关闭传输
     * @param {string} serverId - 服务器ID
     */
    // @ts-ignore
    stop() {
        throw new Error('Stop Method Not Implemented');
    }

    /**
     * 请求路由入口
     * @param {string} serverId - 服务器ID
     * @param {any} req - 请求对象
     * @param {object} res - 响应对象
     */
    // @ts-ignore
    forward() {
        throw new Error('Forward Method Not Implemented');
    }

    /**
     * 返回405 Method Not Allowed
     * @param {object} res - 响应对象
     */
    endWithMethodNotAllowed(res) {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(
            JSON.stringify({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Method not allowed.',
                },
                id: null,
            })
        );
    }
}

/**
 * STDIO传输处理器
 */
class StdioTransportHandler extends BaseTransportHandler {
    constructor(processManager, requestManager, logger) {
        super(logger);
        this.processManager = processManager;
        this.requestManager = requestManager;
    }

    async start(serverId, config) {
        if (!config.command) {
            throw new Error(`服务器 ${serverId} 的 stdio 传输需要指定 command 字段`);
        }

        // 初始化请求队列
        this.requestManager.initializeServerQueue(serverId);

        if (this.processManager.isProcessRunning(serverId)) {
            await this.processManager.stopStdioProcess(serverId);
        }
        // 创建进程
        const transport = await this.processManager.createStdioProcess(serverId, config);
        transport.onmessage = (message) => {
            this.handleProcessData(serverId, message);
        };

        transport.onerror = (error) => {
            this.handleProcessError(serverId, error);
        };

        transport.onclose = () => {
            this.handleProcessExit(serverId);
        };
    }

    async stop(serverId) {
        try {
            await this.processManager.stopStdioProcess(serverId);
            this.requestManager.deleteServerQueue(serverId);
        } catch (error) {
            this.logger?.error(`[STDIO] 停止失败 [${serverId}]:`, error);
            throw error;
        }
    }

    async forward(serverId, req, res) {
        const method = req.method?.toUpperCase() || 'POST';

        switch (method) {
            case 'POST':
                return this.handlePost(serverId, req, res);
            case 'GET':
                return this.handleGet(serverId, req, res);
            case 'DELETE':
                return this.handleDelete(serverId, req, res);
            default:
                throw new Error(`不支持的HTTP方法: ${method}`);
        }
    }

    async handlePost(serverId, req, res) {
        const isRunning = this.processManager.isProcessRunning(serverId);

        if (!isRunning) {
            const error = new Error(`服务器 ${serverId} 的进程未运行`);
            this.logger?.error(`[STDIO] 进程未运行 [${serverId}]`);
            throw error;
        }

        // 确保消息符合JSON-RPC 2.0规范
        const mcpMessage = this.formatMCPMessage(req.body);
        const clientId = mcpMessage.id;

        // 生成内部唯一ID
        const internalId = this.requestManager.generateRequestId();
        const messageWithInternalId = { ...mcpMessage, id: internalId };

        return new Promise(async (resolve, reject) => {
            try {
                // 添加到待处理请求队列
                this.requestManager.addPendingRequest(
                    serverId,
                    internalId,
                    clientId,
                    // stdio响应 => http响应
                    (response) => {
                        // 结束请求
                        res.writeHead(200, { 'content-type': 'application/json' });
                        res.end(JSON.stringify(response));
                        resolve({
                            response,
                            headers: { 'content-type': 'application/json' },
                            status: 200,
                        });
                    },
                    (error) => {
                        this.logger?.error(`[STDIO] 请求失败 [${serverId}]:`, error);
                        reject(error);
                    },
                    STDIO_MESSAGE_RESPONSE_TIMEOUT
                );

                // 发送请求到MCP服务器
                await this.processManager.sendMessage(serverId, messageWithInternalId);
            } catch (error) {
                this.requestManager.removePendingRequest(serverId, internalId);
                reject(error);
            }
        });
    }

    /**
     * 创建长连接，暂不支持
     */
    async handleGet(serverId, req, res) {
        const isRunning = this.processManager.isProcessRunning(serverId);
        if (!isRunning) {
            throw new Error(`服务器 ${serverId} 的进程未运行`);
        }

        this.endWithMethodNotAllowed(res);
    }

    /**
     * 删除请求，暂不支持
     */
    async handleDelete(serverId, req, res) {
        const isRunning = this.processManager.isProcessRunning(serverId);
        if (!isRunning) {
            throw new Error(`服务器 ${serverId} 的进程未运行`);
        }

        this.endWithMethodNotAllowed(res);
    }

    /**
     * 处理进程数据
     * @param {string} serverId - 服务器ID
     * @param {object} data - 数据
     * @private
     */
    handleProcessData(serverId, data) {
        const internalId = data.id;
        if (internalId === undefined || internalId === null) {
            return;
        }

        const pendingRequest = this.requestManager.findPendingRequest(serverId, internalId);
        if (!pendingRequest) {
            return;
        }

        // 恢复客户端原始ID并处理响应
        const clientResponse = { ...data, id: pendingRequest.clientId };

        if (data.jsonrpc === '2.0') {
            pendingRequest.resolve(clientResponse);
        } else {
            this.logger?.error(`[STDIO] 无效响应格式 [${serverId}]`);
            pendingRequest.reject(new Error(`无效的JSON-RPC响应格式`));
        }

        this.requestManager.removePendingRequest(serverId, internalId);
    }

    /**
     * 处理进程错误
     * @param {string} serverId - 服务器ID
     * @param {Error} error - 错误信息
     * @private
     */
    handleProcessError(serverId, error) {
        this.requestManager.clearServerRequests(
            serverId,
            new Error(`${serverId}进程错误: ${error.message}`)
        );
    }

    /**
     * 处理进程退出
     * @param {string} serverId - 服务器ID
     * @param {number|null} code - 退出代码
     * @param {string|null} signal - 退出信号
     * @private
     */
    handleProcessExit(serverId) {
        this.requestManager.clearServerRequests(serverId, new Error(`${serverId}进程退出`));
    }

    /**
     * 格式化MCP消息
     * @param {any} data - 原始数据
     * @returns {any} 格式化后的消息
     * @private
     */
    formatMCPMessage(data) {
        // 如果已经是有效的JSON-RPC消息，直接返回
        if (data && data.jsonrpc === '2.0' && data.method && data.id !== undefined) {
            return data;
        }

        // 构造符合JSON-RPC 2.0规范的消息
        const mcpMessage = {
            jsonrpc: '2.0',
            id: data.id !== undefined ? data.id : this.requestManager.generateRequestId(),
            method: data.method || 'initialize',
        };

        // 如果有params，添加到消息中
        if (data.params !== undefined) {
            mcpMessage.params = data.params;
        }

        // 如果是响应消息，添加result或error
        if (data.result !== undefined) {
            mcpMessage.result = data.result;
        }
        if (data.error !== undefined) {
            mcpMessage.error = data.error;
        }

        return mcpMessage;
    }
}

/**
 * SSE传输处理器
 */
class SSETransportHandler extends BaseTransportHandler {
    constructor(logger) {
        super(logger);
        this.sseProxies = new Map();
        this.clientTransports = new Map();
        this.serverTransports = new Map();
    }

    async start(serverId, config) {
        if (!config.sseUrl) {
            const error = new Error('SSE传输需要提供URL');
            this.logger?.error(`[SSE] 启动失败 [${serverId}]:`, error);
            throw error;
        }

        this.sseProxies.set(serverId, {
            url: config.sseUrl,
        });
    }

    async stop(serverId) {
        const sseProxy = this.sseProxies.get(serverId);
        if (sseProxy) {
            try {
                this.sseProxies.delete(serverId);
            } catch (error) {
                this.logger?.error(`[SSE] 停止失败 [${serverId}]:`, error);
                throw error;
            }
        }
    }

    async forward(serverId, req, res) {
        const method = req.method?.toUpperCase() || 'GET';

        switch (method) {
            case 'POST':
                return this.handlePost(serverId, req, res);
            case 'GET':
                return this.handleGet(serverId, req, res);
            default:
                throw new Error(`SSE传输不支持的HTTP方法: ${method}`);
        }
    }

    async handlePost(serverId, req, res) {
        const sseProxy = this.sseProxies.get(serverId);

        if (!sseProxy) {
            this.logger?.error(`[SSE] 连接未找到 [${serverId}]`);
            throw new Error(`服务器 ${serverId} 的SSE连接未找到`);
        }

        const serverTransport = this.serverTransports.get(req.query.sessionId);

        if (!serverTransport) {
            this.logger?.error(`[SSE] Session不存在 [${serverId}]`);
            throw new Error(`session ${req.query.sessionId} 不存在`);
        }

        try {
            await serverTransport.handlePostMessage(req, res, req.body);
        } catch (error) {
            this.logger?.error(`[SSE] POST失败 [${serverId}]:`, error);
            throw error;
        }
    }

    async handleGet(serverId, req, res) {
        const sseProxy = this.sseProxies.get(serverId);
        if (!sseProxy) {
            this.logger?.error(`[SSE] 连接未找到 [${serverId}]`);
            throw new Error(`服务器 ${serverId} 的SSE连接未找到`);
        }

        let serverClosed = false;
        let clientClosed = false;

        const headers = {
            ...req.headers,
            accept: 'text/event-stream',
        };

        // 获取原请求的协议和主机名
        const protocol =
            req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
        const hostname = (req.headers.host || 'localhost').split(':')[0];

        try {
            const clientTransport = new SSEClientTransport(new URL(sseProxy.url), {
                headers,
            });

            await clientTransport.start();
            const mcpEndpointPort = env.mcpEndpointPort || 7005;
            const messageEndpoint = `${protocol}://${hostname}:${mcpEndpointPort}/mcp-endpoint/${serverId}/messages`;

            const serverTransport = new SSEServerTransport(messageEndpoint, res, {
                headers,
            });
            await serverTransport.start();

            this.serverTransports.set(serverTransport.sessionId, serverTransport);
            this.clientTransports.set(serverTransport.sessionId, clientTransport);

            serverTransport.onmessage = (message) => clientTransport.send(message);
            clientTransport.onmessage = (message) => serverTransport.send(message);
            serverTransport.onclose = () => {
                serverClosed = true;
                if (!clientClosed) {
                    clientTransport.close().catch(() => {});
                }
            };

            clientTransport.onclose = () => {
                clientClosed = true;
                if (!serverClosed) {
                    serverTransport.close().catch(() => {});
                }
            };
        } catch (error) {
            this.logger?.error(`[SSE] GET失败 [${serverId}]:`, error);
            throw error;
        }
    }
}

/**
 * Streamable HTTP传输处理器
 */
class StreamableHttpTransportHandler extends BaseTransportHandler {
    constructor(logger) {
        super(logger);
        this.httpProxies = new Map();
        this.clientTransports = new Map();
        this.serverTransports = new Map();
    }

    async start(serverId, config) {
        if (!config.httpUrl) {
            const error = new Error('Streamable HTTP传输需要提供URL');
            this.logger?.error(`[HTTP] 启动失败 [${serverId}]:`, error);
            throw error;
        }

        // 验证URL格式
        try {
            new URL(config.httpUrl);
        } catch (error) {
            this.logger?.error(`[HTTP] URL无效 [${serverId}]:`, error);
            throw new Error(`无效的URL格式: ${config.httpUrl}`);
        }

        this.httpProxies.set(serverId, {
            url: config.httpUrl,
        });
    }

    async stop(serverId) {
        const httpProxy = this.httpProxies.get(serverId);
        if (httpProxy) {
            try {
                this.httpProxies.delete(serverId);
            } catch (error) {
                this.logger?.error(`[HTTP] 停止失败 [${serverId}]:`, error);
                throw error;
            }
        }
    }

    async forward(serverId, req, res) {
        const method = req.method?.toUpperCase() || 'GET';
        switch (method) {
            case 'POST':
                return this.handlePost(serverId, req, res);
            case 'GET':
                return this.handleGet(serverId, req, res);
            case 'DELETE':
                return this.handleDelete(serverId, req, res);
            default:
                throw new Error(`Streamable HTTP传输不支持的HTTP方法: ${method}`);
        }
    }

    async handlePost(serverId, req, res) {
        const httpProxy = this.httpProxies.get(serverId);

        if (!httpProxy) {
            this.logger?.error(`[HTTP] 代理未找到 [${serverId}]`);
            throw new Error(`服务器 ${serverId} 的HTTP代理未找到`);
        }

        const sessionId = req.headers['mcp-session-id'];

        let clientTransport = null;
        let serverTransport = null;

        if (sessionId) {
            clientTransport = this.clientTransports.get(sessionId);
            serverTransport = this.serverTransports.get(sessionId);
            if (!clientTransport || !serverTransport) {
                this.logger?.error(`[HTTP] Session不存在 [${serverId}]`);
                throw new Error(`session ${sessionId} transport 不存在`);
            }
        } else {
            const headers = {
                ...req.headers,
                accept: 'text/event-stream, application/json',
            };
            delete headers['content-length'];
            let clientClosed = false;
            let serverClosed = false;

            clientTransport = new StreamableHTTPClientTransport(new URL(httpProxy.url), {
                requestInit: { headers },
            });
            serverTransport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => require('crypto').randomUUID(),
                onsessioninitialized: (newSessionId) => {
                    this.serverTransports.set(newSessionId, serverTransport);
                    this.clientTransports.set(newSessionId, clientTransport);
                },
            });

            serverTransport.onmessage = (message) => clientTransport.send(message);
            clientTransport.onmessage = (message) => serverTransport.send(message);
            serverTransport.onclose = () => {
                serverClosed = true;
                if (!clientClosed) {
                    clientTransport.close().catch(() => {});
                }
            };

            clientTransport.onclose = () => {
                clientClosed = true;
                if (!serverClosed) {
                    serverTransport.close().catch(() => {});
                }
            };

            await serverTransport.start();
        }

        try {
            await serverTransport.handleRequest(req, res, req.body);
        } catch (error) {
            this.logger?.error(`[HTTP] POST失败 [${serverId}]:`, error);
            throw error;
        }
    }

    async handleGet(serverId, req, res) {
        const httpProxy = this.httpProxies.get(serverId);
        if (!httpProxy) {
            throw new Error(`服务器 ${serverId} 的HTTP代理未找到`);
        }

        const sessionId = req.headers['mcp-session-id'];
        const serverTransport = this.serverTransports.get(sessionId);
        if (!serverTransport) {
            throw new Error('session id is required');
        }

        await serverTransport.handleRequest(req, res, req.body);
    }

    async handleDelete(serverId, req, res) {
        const httpProxy = this.httpProxies.get(serverId);

        if (!httpProxy) {
            this.logger?.error(`[HTTP] 代理未找到 [${serverId}]`);
            throw new Error(`服务器 ${serverId} 的HTTP代理未找到`);
        }

        const sessionId = req.headers['mcp-session-id'];
        const serverTransport = this.serverTransports.get(sessionId);

        if (!serverTransport) {
            this.logger?.error(`[HTTP] Session不存在 [${serverId}]`);
            throw new Error(`session ${sessionId} 不存在`);
        }

        try {
            await serverTransport.handleRequest(req, res, req.body);

            const clientTransport = this.clientTransports.get(sessionId);
            if (clientTransport) {
                // 向真实MCP服务器发送DELETE请求
                await clientTransport.terminateSession();
                await clientTransport.close();
                this.clientTransports.delete(sessionId);
            }

            this.serverTransports.delete(sessionId);
        } catch (error) {
            this.logger?.error(`[HTTP] DELETE失败 [${serverId}]:`, error);
            throw error;
        }
    }
}

module.exports = {
    StdioTransportHandler,
    SSETransportHandler,
    StreamableHttpTransportHandler,
};
