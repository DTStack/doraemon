const fetch = require('node-fetch');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');

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
     * 启动传输
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
     * 通用请求路由方法
     * @param {string} serverId - 服务器ID
     * @param {any} req - 请求对象
     * @param {object} res - 响应对象
     */
    forward(serverId, req, res) {
        throw new Error('Forward Method Not Implemented');
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
        const transport = await this.processManager.createStdioProcess(
            serverId,
            config,
        );

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

    /**
     * 处理POST请求
     * @param {string} serverId - 服务器ID
     * @param {any} req - 请求数据
     * @param {object} res - 响应数据
     */
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
                    (response) => {
                        const formattedResponse = this.formatResponse(
                            response,
                            { 'Content-Type': 'application/json' },
                            200
                        );

                        // 结束请求
                        res.set(formattedResponse.headers);
                        res.status = formattedResponse.status;
                        res.body = formattedResponse.response;
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
                 await this.processManager.sendMessage(
                    serverId,
                    messageWithInternalId
                );
            } catch (error) {
                this.requestManager.removePendingRequest(serverId, internalId);
                reject(error);
            }
        });
    }

    /**
     * 处理GET请求
     * @param {string} serverId - 服务器ID
     * @param {any} req - 请求数据
     * @param {object} res - 响应数据
     * @returns {Promise<{response: any, headers?: Record<string, string>, status: number}>} 响应数据
     */
    async handleGet(serverId, req, res) {
        const isRunning = this.processManager.isProcessRunning(serverId);
        if (!isRunning) {
            throw new Error(`服务器 ${serverId} 的进程未运行`);
        }

        // GET请求通常用于查询服务器状态或获取资源信息
        const mcpMessage = {
            jsonrpc: '2.0',
            id: this.requestManager.generateRequestId(),
            method: req.query?.method,
            params: req.query || {},
        };

        const clientId = mcpMessage.id;
        const internalId = this.requestManager.generateRequestId();
        const messageWithInternalId = { ...mcpMessage, id: internalId };

        console.log(
            `STDIO GET请求映射 [${serverId}]: 客户端ID=${clientId} -> 内部ID=${internalId}`
        );

        return new Promise(async (resolve, reject) => {
            try {
                this.requestManager.addPendingRequest(
                    serverId,
                    internalId,
                    clientId,
                    (response) => {
                        const formattedResponse = this.formatResponse(
                            response,
                            {
                                'Content-Type': 'application/json',
                                'Cache-Control': 'no-cache',
                            },
                            200
                        );
                        resolve(formattedResponse);
                    },
                    reject,
                    MESSAGE_RESPONSE_TIMEOUT
                );

                const success = await this.processManager.sendMessage(
                    serverId,
                    messageWithInternalId
                );
                if (!success) {
                    this.requestManager.removePendingRequest(serverId, internalId);
                    reject(new Error('GET请求发送到进程失败'));
                }
            } catch (error) {
                this.requestManager.removePendingRequest(serverId, internalId);
                reject(error);
            }
        });
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

        // DELETE请求用于删除资源
        const mcpMessage = {
            jsonrpc: '2.0',
            id: this.requestManager.generateRequestId(),
            method: req.body?.method || 'delete',
            params: {
                ...req.body?.params,
                resourceId: req.params?.id || req.body?.resourceId,
            },
        };

        const clientId = mcpMessage.id;
        const internalId = this.requestManager.generateRequestId();
        const messageWithInternalId = { ...mcpMessage, id: internalId };

        console.log(
            `STDIO DELETE请求映射 [${serverId}]: 客户端ID=${clientId} -> 内部ID=${internalId}`
        );

        return new Promise(async (resolve, reject) => {
            try {
                this.requestManager.addPendingRequest(
                    serverId,
                    internalId,
                    clientId,
                    (response) => {
                        const formattedResponse = this.formatResponse(
                            response,
                            { 'Content-Type': 'application/json' },
                            204 // DELETE成功通常返回204 No Content
                        );
                        resolve(formattedResponse);
                    },
                    reject,
                    MESSAGE_RESPONSE_TIMEOUT
                );

                const success = await this.processManager.sendMessage(
                    serverId,
                    messageWithInternalId
                );
                if (!success) {
                    this.requestManager.removePendingRequest(serverId, internalId);
                    reject(new Error(`${serverId}DELETE请求发送到进程失败`));
                }
            } catch (error) {
                this.requestManager.removePendingRequest(serverId, internalId);
                reject(error);
            }
        });
    }

    /**
     * 检查是否运行
     * @param {string} serverId - 服务器ID
     * @returns {boolean} 是否运行中
     */
    isRunning(serverId) {
        return this.processManager.isProcessRunning(serverId);
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
        this.requestManager.clearServerRequests(serverId, new Error(`${serverId}进程错误: ${error.message}`));
    }

    /**
     * 处理进程退出
     * @param {string} serverId - 服务器ID
     * @param {number|null} code - 退出代码
     * @param {string|null} signal - 退出信号
     * @private
     */
    handleProcessExit(serverId) {
        this.requestManager.clearServerRequests(
            serverId,
            new Error(`${serverId}进程退出`)
        );
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

    /**
     * 处理POST请求
     * @param {string} serverId - 服务器ID
     * @param {any} req - 请求数据
     * @param {object} res - 响应数据
     */
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

    /**
     * 处理GET请求
     * @param {string} serverId - 服务器ID
     * @param {any} req - 请求数据
     * @param {object} res - 响应数据
     */
    async handleGet(serverId, req, res) {
        const sseProxy = this.sseProxies.get(serverId);
        if (!sseProxy) {
            throw new Error(`服务器 ${serverId} 的SSE连接未找到`);
        }

        let transportToClientClosed = false;
        let transportToServerClosed = false;

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
            if (transportToServerClosed) {
                return;
            }

            transportToClientClosed = true;
            clientTransport.close().catch((e) => console.log(e));
        };

        clientTransport.onclose = () => {
            if (transportToClientClosed) {
                return;
            }
            transportToServerClosed = true;
            serverTransport.close().catch((e) => console.log(e));
        };
        
    }

    /**
     * 检查是否运行
     * @param {string} serverId - 服务器ID
     * @returns {boolean} 是否运行中
     */
    isRunning(serverId) {
        return this.sseProxies.has(serverId);
    }
}

/**
 * Streamable HTTP传输处理器
 */
class StreamableHttpTransportHandler extends BaseTransportHandler {
    constructor() {
        super();
        this.httpProxies = new Map();
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

        // 存储HTTP代理信息
        this.httpProxies.set(serverId, {
            url: config.httpUrl,
            headers: config.headers || {},
        });

        console.log(`Streamable HTTP传输处理器启动: ${serverId} -> ${config.httpUrl}`);
    }

    async stop(serverId) {
        this.httpProxies.delete(serverId);
        console.log(`Streamable HTTP传输处理器已停止: ${serverId}`);
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
                throw new Error(`Streamable HTTP传输不支持的HTTP方法: ${method}`);
        }
    }

    /**
     * 处理POST请求
     * @param {string} serverId - 服务器ID
     * @param {any} req - 请求数据
     * @param {object} res - 响应数据
     * @returns {Promise<{response: any, headers?: Record<string, string>, status: number, streamPromise?: Promise<void>}>} 响应数据
     */
    async handlePost(serverId, req, res) {
        const httpProxy = this.httpProxies.get(serverId);
        if (!httpProxy) {
            throw new Error(`服务器 ${serverId} 的HTTP代理未启动`);
        }

        try {
            console.log(`转发POST请求到Streamable HTTP服务器: ${httpProxy.url}`);

            // 设置POST请求头
            const headers = {
                ...req.headers,
                ...httpProxy.headers,
                'Content-Type': 'application/json',
                Accept: 'application/json, text/event-stream',
            };

            // 发送HTTP POST请求
            console.log(`发送POST请求头:`, JSON.stringify(headers, null, 2));
            console.log(`发送POST请求体:`, JSON.stringify(req.body));

            const response = await fetch(httpProxy.url, {
                method: 'POST',
                headers,
                body: JSON.stringify(req.body),
            });

            return this.processHttpResponse(response, 'POST');
        } catch (error) {
            console.error(
                `Streamable HTTP POST请求错误:`,
                error instanceof Error ? error.message : error
            );
            throw new Error(
                `Streamable HTTP POST请求失败: ${
                    error instanceof Error ? error.message : '未知错误'
                }`
            );
        }
    }

    /**
     * 处理GET请求
     * @param {string} serverId - 服务器ID
     * @param {any} req - 请求数据
     * @param {object} res - 响应数据
     * @returns {Promise<{response: any, headers?: Record<string, string>, status: number, streamPromise?: Promise<void>}>} 响应数据
     */
    async handleGet(serverId, req, res) {
        const httpProxy = this.httpProxies.get(serverId);
        if (!httpProxy) {
            throw new Error(`服务器 ${serverId} 的HTTP代理未启动`);
        }

        try {
            console.log(`转发GET请求到Streamable HTTP服务器: ${httpProxy.url}`);

            // 构建查询参数
            const url = new URL(httpProxy.url);
            if (req.query) {
                Object.keys(req.query).forEach((key) => {
                    url.searchParams.append(key, req.query[key]);
                });
            }

            // 设置GET请求头
            const headers = {
                ...req.headers,
                ...httpProxy.headers,
                Accept: 'application/json, text/event-stream',
            };

            console.log(`发送GET请求到: ${url.toString()}`);
            console.log(`发送GET请求头:`, JSON.stringify(headers, null, 2));

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers,
            });

            return this.processHttpResponse(response, 'GET');
        } catch (error) {
            console.error(
                `Streamable HTTP GET请求错误:`,
                error instanceof Error ? error.message : error
            );
            throw new Error(
                `Streamable HTTP GET请求失败: ${
                    error instanceof Error ? error.message : '未知错误'
                }`
            );
        }
    }

    /**
     * 处理DELETE请求
     * @param {string} serverId - 服务器ID
     * @param {any} req - 请求数据
     * @param {object} res - 响应数据
     * @returns {Promise<{response: any, headers?: Record<string, string>, status: number, streamPromise?: Promise<void>}>} 响应数据
     */
    async handleDelete(serverId, req, res) {
        const httpProxy = this.httpProxies.get(serverId);
        if (!httpProxy) {
            throw new Error(`服务器 ${serverId} 的HTTP代理未启动`);
        }

        try {
            console.log(`转发DELETE请求到Streamable HTTP服务器: ${httpProxy.url}`);

            // 构建DELETE URL，通常包含资源ID
            let url = httpProxy.url;
            if (req.params?.id) {
                url = `${url}/${req.params.id}`;
            } else if (req.body?.resourceId) {
                url = `${url}/${req.body.resourceId}`;
            }

            // 设置DELETE请求头
            const headers = {
                ...req.headers,
                ...httpProxy.headers,
                Accept: 'application/json',
            };

            // 如果有请求体，添加Content-Type
            if (req.body && Object.keys(req.body).length > 0) {
                headers['Content-Type'] = 'application/json';
            }

            console.log(`发送DELETE请求到: ${url}`);
            console.log(`发送DELETE请求头:`, JSON.stringify(headers, null, 2));

            const response = await fetch(url, {
                method: 'DELETE',
                headers,
                body:
                    req.body && Object.keys(req.body).length > 0
                        ? JSON.stringify(req.body)
                        : undefined,
            });

            return this.processHttpResponse(response, 'DELETE');
        } catch (error) {
            console.error(
                `Streamable HTTP DELETE请求错误:`,
                error instanceof Error ? error.message : error
            );
            throw new Error(
                `Streamable HTTP DELETE请求失败: ${
                    error instanceof Error ? error.message : '未知错误'
                }`
            );
        }
    }

    /**
     * 处理HTTP响应的通用方法
     * @param {Response} response - HTTP响应
     * @param {string} method - HTTP方法
     * @returns {Promise<{response: any, headers?: Record<string, string>, status: number, streamPromise?: Promise<void>}>} 响应数据
     * @private
     */
    async processHttpResponse(response, method) {
        console.log(`收到${method}响应状态: ${response.status} ${response.statusText}`);
        console.log(`响应头:`, Object.fromEntries(response.headers.entries()));

        // 立即提取响应头信息
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        // 立即返回响应状态和头信息
        const responseInfo = {
            status: response.status,
            headers: responseHeaders,
        };

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error(`HTTP ${method}请求失败详情: 状态=${response.status}, 响应=${errorText}`);
            throw new Error(
                `HTTP ${method}请求失败: ${response.status} ${response.statusText}${
                    errorText ? ` - ${errorText}` : ''
                }`
            );
        }

        const contentType = response.headers.get('content-type') || '';
        console.log(`${method}响应Content-Type: ${contentType}`);

        // 处理不同类型的响应
        if (contentType.includes('text/event-stream')) {
            // SSE流响应 - 立即返回响应信息，异步处理流
            console.log(`处理${method} SSE流响应`);

            // 流式转发模式 - 异步处理流数据
            const streamPromise = this.processSSEStreamAsync(response);
            return {
                response: response,
                ...responseInfo,
                streamPromise,
            };
        } else if (contentType.includes('application/json')) {
            // JSON响应 - 需要读取完整响应体
            let responseText = '';
            try {
                responseText = await response.text();
                console.log(`收到HTTP ${method}原始响应文本:`, responseText);

                if (!responseText.trim()) {
                    // 对于DELETE请求，空响应体是正常的
                    if (method === 'DELETE') {
                        return this.formatResponse(
                            { result: 'Resource deleted successfully' },
                            responseInfo.headers,
                            responseInfo.status
                        );
                    }
                    throw new Error('响应体为空');
                }

                const responseData = JSON.parse(responseText);
                console.log(
                    `成功解析HTTP ${method} JSON响应:`,
                    JSON.stringify(responseData, null, 2)
                );

                return this.formatResponse(responseData, responseInfo.headers, responseInfo.status);
            } catch (parseError) {
                console.error(`解析${method} JSON响应失败:`, parseError);
                console.error(`原始响应内容:`, responseText);
                throw new Error(
                    `JSON解析失败: ${
                        parseError instanceof Error ? parseError.message : '未知错误'
                    } - 响应内容: ${responseText}`
                );
            }
        } else {
            // 其他类型响应
            const responseText = await response.text();
            console.log(`收到HTTP ${method}文本响应:`, responseText);
            try {
                const responseData = JSON.parse(responseText);
                return this.formatResponse(responseData, responseInfo.headers, responseInfo.status);
            } catch {
                return this.formatResponse(
                    { result: responseText },
                    responseInfo.headers,
                    responseInfo.status
                );
            }
        }
    }

    /**
     * 检查是否运行
     * @param {string} serverId - 服务器ID
     * @returns {boolean} 是否运行中
     */
    isRunning(serverId) {
        return this.httpProxies.has(serverId);
    }

    /**
     * 异步处理SSE流数据
     * @param {Response} response - HTTP响应
     * @returns {Promise<void>} 流处理Promise
     * @private
     */
    async processSSEStreamAsync(response) {
        const stream = response.body;
        if (!stream) {
            throw new Error('无法读取SSE流响应');
        }

        let buffer = '';

        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => {
                try {
                    buffer += chunk.toString();

                    // 处理完整的SSE事件
                    const events = this.parseSSEEvents(buffer);

                    for (const event of events.complete) {
                        if (event.data) {
                            try {
                                const eventData = JSON.parse(event.data);
                                console.log(`处理SSE事件:`, JSON.stringify(eventData, null, 2));
                            } catch (parseError) {
                                console.warn(`解析SSE事件数据失败:`, event.data);
                            }
                        }
                    }

                    // 更新缓冲区，保留不完整的事件
                    buffer = events.incomplete;
                } catch (error) {
                    console.error(`处理SSE数据块失败:`, error);
                    reject(error);
                }
            });

            stream.on('end', () => {
                console.log(`SSE流结束`);
                resolve();
            });

            stream.on('error', (error) => {
                console.error(`SSE流处理失败:`, error);
                reject(error);
            });
        });
    }

    /**
     * 解析SSE事件
     * @param {string} buffer - 缓冲区内容
     * @returns {{complete: Array<{id?: string, event?: string, data?: string}>, incomplete: string}} 解析结果
     * @private
     */
    parseSSEEvents(buffer) {
        const lines = buffer.split('\n');
        const complete = [];
        let current = {};
        let i = 0;

        while (i < lines.length) {
            const line = lines[i].trim();

            if (line === '') {
                // 空行表示事件结束
                if (Object.keys(current).length > 0) {
                    complete.push(current);
                    current = {};
                }
            } else if (line.startsWith('id: ')) {
                current.id = line.slice(4);
            } else if (line.startsWith('event: ')) {
                current.event = line.slice(7);
            } else if (line.startsWith('data: ')) {
                current.data = line.slice(6);
            }

            i++;
        }

        // 检查是否有不完整的事件
        let incomplete = '';
        if (Object.keys(current).length > 0) {
            // 重建不完整的事件
            if (current.id) incomplete += `id: ${current.id}\n`;
            if (current.event) incomplete += `event: ${current.event}\n`;
            if (current.data) incomplete += `data: ${current.data}\n`;
        }

        return { complete, incomplete };
    }
}

module.exports = {
    StdioTransportHandler,
    SSETransportHandler,
    StreamableHttpTransportHandler,
};
