const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const {
    StreamableHTTPClientTransport,
} = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const {
    StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

const MESSAGE_RESPONSE_TIMEOUT = 30000;

class BaseTransportHandler {
    /**
     * 统一的响应处理方法
     * @param {any} response - 响应数据
     * @param {Record<string, string>} headers - 响应头
     * @param {number} status - 状态码
     * @returns {{response: any, headers: Record<string, string>, status: number}} 格式化的响应
     */
    formatResponse(response, headers, status) {
        return {
            response,
            headers,
            status,
        };
    }

    /**
     * 启动服务，记录传输配置
     * @param {string} serverId - 服务器ID
     * @param {object} config - 配置
     */
    start(serverId, config) {
        throw new Error('Start Method Not Implemented');
    }

    /**
     * 关闭传输
     * @param {string} serverId - 服务器ID
     */
    stop(serverId) {
        throw new Error('Stop Method Not Implemented');
    }

    /**
     * 请求路由入口
     * @param {string} serverId - 服务器ID
     * @param {any} req - 请求对象
     * @param {object} res - 响应对象
     */
    forward(serverId, req, res) {
        throw new Error('Forward Method Not Implemented');
    }

    /**
     * 返回405 Method Not Allowed
     * @param {object} res - 响应对象
     */
    endWithMethodNotAllowed(res) {
        res.status = 405;
        res.set({
            'content-type': 'application/json',
        });
        res.res.end(
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
    constructor(processManager, requestManager) {
        super();
        this.processManager = processManager;
        this.requestManager = requestManager;
    }

    async start(serverId, config) {
        if (!config.command) {
            throw new Error(`服务器 ${serverId} 的 stdio 传输需要指定 command 字段`);
        }

        // 初始化请求队列
        this.requestManager.initializeServerQueue(serverId);

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
        await this.processManager.stopStdioProcess(serverId);
        this.requestManager.deleteServerQueue(serverId);
        console.log(`STDIO传输处理器已停止: ${serverId}`);
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
            throw new Error(`服务器 ${serverId} 的进程未运行`);
        }

        // 确保消息符合JSON-RPC 2.0规范
        const mcpMessage = this.formatMCPMessage(req.body);
        const clientId = mcpMessage.id;

        // 生成内部唯一ID
        const internalId = this.requestManager.generateRequestId();
        const messageWithInternalId = { ...mcpMessage, id: internalId };

        console.log(
            `STDIO POST请求映射 [${serverId}]: 客户端ID=${clientId} -> 内部ID=${internalId}`
        );

        return new Promise(async (resolve, reject) => {
            try {
                // 添加到待处理请求队列
                this.requestManager.addPendingRequest(
                    serverId,
                    internalId,
                    clientId,
                    // stdio响应 => http响应
                    (response) => {
                        const formattedResponse = this.formatResponse(
                            response,
                            { 'content-type': 'application/json' },
                            200
                        );

                        // 结束请求
                        res.set(formattedResponse.headers);
                        res.status = formattedResponse.status;
                        res.res.end( JSON.stringify(formattedResponse.response));
                        resolve(formattedResponse);
                    },
                    reject,
                    MESSAGE_RESPONSE_TIMEOUT
                );

                console.log(
                    `发送到STDIO进程 [${serverId}]: 客户端ID=${clientId}, 内部ID=${internalId}`
                );
                console.log(`发送消息内容:`, JSON.stringify(messageWithInternalId));

                // 发送请求到MCP服务器
                await this.processManager.sendMessage(serverId, messageWithInternalId);
            } catch (error) {
                this.requestManager.removePendingRequest(serverId, internalId);
                reject(error);
            }
        });
    }

    async handleGet(serverId, req, res) {
        const isRunning = this.processManager.isProcessRunning(serverId);
        if (!isRunning) {
            throw new Error(`服务器 ${serverId} 的进程未运行`);
        }

        return this.endWithMethodNotAllowed(res);
    }

    /**
     * 处理DELETE请求
     * @param {string} serverId - 服务器ID
     * @param {any} req - 请求数据
     * @param {object} res - 响应数据
     * @returns {Promise<{response: any, headers?: Record<string, string>, status: number}>} 响应数据
     */
    async handleDelete(serverId, req, res) {
        const isRunning = this.processManager.isProcessRunning(serverId);
        if (!isRunning) {
            throw new Error(`服务器 ${serverId} 的进程未运行`);
        }

        return this.endWithMethodNotAllowed(res);
    }

    /**
     * 处理进程数据
     * @param {string} serverId - 服务器ID
     * @param {object} data - 数据
     * @private
     */
    handleProcessData(serverId, data) {
        let pendingRequest;

        const internalId = data.id;
        if (internalId === undefined || internalId === null) {
            console.warn(`${serverId}响应缺少ID: ${internalId}`);
            return;
        }

        pendingRequest = this.requestManager.findPendingRequest(serverId, internalId);
        if (!pendingRequest) {
            return;
        }

        // 恢复客户端原始ID并处理响应
        const clientResponse = { ...data, id: pendingRequest.clientId };

        if (data.jsonrpc === '2.0') {
            pendingRequest.resolve(clientResponse);
        } else {
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
    constructor() {
        super();
        this.sseProxies = new Map();
        this.clientTransports = new Map();
        this.serverTransports = new Map();
    }

    async start(serverId, config) {
        if (!config.sseUrl) {
            throw new Error('SSE传输需要提供URL');
        }

        // 暂时创建一个简单的占位符对象
        const mockEventSource = {
            url: config.sseUrl,
            headers: config.headers || {},
            close: () => {},
        };

        console.log(`SSE传输处理器启动: ${serverId} -> ${config.sseUrl}`);
        this.sseProxies.set(serverId, mockEventSource);
    }

    async stop(serverId) {
        const sseProxy = this.sseProxies.get(serverId);
        if (sseProxy) {
            sseProxy.close();
            this.sseProxies.delete(serverId);
            console.log(`SSE传输处理器已停止: ${serverId}`);
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
            throw new Error(`服务器 ${serverId} 的SSE连接未找到`);
        }

        const serverTransport = this.serverTransports.get(req.query.sessionId);

        if (!serverTransport) {
            throw new Error(`session ${req.query.sessionId} 不存在`);
        }

        try {
            // 由于Egg.js已经解析了请求体，我们需要将解析好的body传递给handlePostMessage
            await serverTransport.handlePostMessage(req.req, res.res, req.body);
        } catch (error) {
            console.error(`SSE POST请求处理错误:`, error);
            throw error;
        }
    }

    async handleGet(serverId, req, res) {
        const sseProxy = this.sseProxies.get(serverId);
        if (!sseProxy) {
            throw new Error(`服务器 ${serverId} 的SSE连接未找到`);
        }

        let serverClosed = false;
        let clientClosed = false;

        const headers = {
            ...req.headers,
            ...sseProxy.headers,
            accept: 'text/event-stream',
        };

        const clientTransport = new SSEClientTransport(new URL(sseProxy.url), {
            headers,
        });

        await clientTransport.start();
        const messageEndpoint = 'http://localhost:7001/mcp-endpoint/' + serverId + '/messages';

        const serverTransport = new SSEServerTransport(messageEndpoint, res.res, {
            headers,
        });
        await serverTransport.start();

        this.serverTransports.set(serverTransport.sessionId, serverTransport);
        this.clientTransports.set(serverTransport.sessionId, clientTransport);

        serverTransport.onmessage = (message) => clientTransport.send(message);
        clientTransport.onmessage = (message) => serverTransport.send(message);
        serverTransport.onclose = () => {
            serverClosed = true;
            if (clientClosed) {
                return;
            }
            clientTransport.close().catch((e) => console.log(e));
        };

        clientTransport.onclose = () => {
            clientClosed = true;
            if (serverClosed) {
                return;
            }
            serverTransport.close().catch((e) => console.log(e));
        };
    }
}

/**
 * Streamable HTTP传输处理器
 */
class StreamableHttpTransportHandler extends BaseTransportHandler {
    constructor() {
        super();
        this.httpProxies = new Map();
        this.clientTransports = new Map();
        this.serverTransports = new Map();
    }

    async start(serverId, config) {
        if (!config.httpUrl) {
            throw new Error('Streamable HTTP传输需要提供URL');
        }

        // 验证URL格式
        try {
            new URL(config.httpUrl);
        } catch (error) {
            throw new Error(`无效的URL格式: ${config.httpUrl}`);
        }

        // 暂时创建一个简单的占位符对象
        const mockProxy = {
            url: config.httpUrl,
            headers: config.headers || {},
            close: () => {},
        };

        console.log(`Streamable HTTP传输处理器启动: ${serverId} -> ${config.httpUrl}`);
        this.httpProxies.set(serverId, mockProxy);
    }

    async stop(serverId) {
        const httpProxy = this.httpProxies.get(serverId);
        if (httpProxy) {
            httpProxy.close();
            this.httpProxies.delete(serverId);
            console.log(`Streamable HTTP传输处理器已停止: ${serverId}`);
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
            throw new Error(`服务器 ${serverId} 的HTTP代理未找到`);
        }

        const sessionId = req.headers['mcp-session-id'];

        let clientTransport = null;
        let serverTransport = null;
        if (sessionId) {
            clientTransport = this.clientTransports.get(sessionId);
            serverTransport = this.serverTransports.get(sessionId);
            if (!clientTransport || !serverTransport) {
                throw new Error(`session ${sessionId} transport 不存在`);
            }
        } else {
            const headers = {
                ...req.headers,
                ...httpProxy.headers,
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
                onsessioninitialized: (sessionId) => {
                    this.serverTransports.set(sessionId, serverTransport);
                    this.clientTransports.set(sessionId, clientTransport);
                },
            });

            serverTransport.onmessage = (message) => clientTransport.send(message);
            clientTransport.onmessage = (message) => serverTransport.send(message);
            serverTransport.onclose = () => {
                serverClosed = true;
                if (clientClosed) {
                    return;
                }
                clientTransport.close().catch((e) => console.log(e));
            };

            clientTransport.onclose = () => {
                clientClosed = true;
                if (serverClosed) {
                    return;
                }
                serverTransport.close().catch((e) => console.log(e));
            };

            await serverTransport.start();
        }

        try {
            await serverTransport.handleRequest(req.req, res.res, req.body);
        } catch (error) {
            console.error(`Streamable HTTP POST请求处理错误:`, error);
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

        await serverTransport.handleRequest(req.req, res.res, req.body);
    }

    async handleDelete(serverId, req, res) {
        const httpProxy = this.httpProxies.get(serverId);
        if (!httpProxy) {
            throw new Error(`服务器 ${serverId} 的HTTP代理未找到`);
        }

        const sessionId = req.headers['mcp-session-id'];
        const serverTransport = this.serverTransports.get(sessionId);

        if (!serverTransport) {
            throw new Error(`session ${sessionId} 不存在`);
        }

        try {
            await serverTransport.handleRequest(req.req, res.res, req.body);

            const clientTransport = this.clientTransports.get(sessionId);
            if (clientTransport) {
                await clientTransport.terminateSession();
                await clientTransport.close();
                this.clientTransports.delete(sessionId);
            }

            this.serverTransports.delete(sessionId);
        } catch (error) {
            console.error(`Streamable HTTP DELETE请求处理错误:`, error);
            throw error;
        }
    }
}

module.exports = {
    StdioTransportHandler,
    SSETransportHandler,
    StreamableHttpTransportHandler,
};
