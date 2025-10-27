const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const {
    StreamableHTTPClientTransport,
} = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

/**
 * MCP客户端封装类
 * 提供与MCP服务器通信的统一接口
 */
class MCPClient {
    constructor(logger) {
        this.logger = logger;
        this.client = null;
        this.transport = null;
    }

    /**
     * 创建并连接MCP客户端
     * @param {Object} server - 服务器配置
     * @returns {Promise<boolean>} 连接是否成功
     */
    async connect(server) {
        try {
            this.transport = await this.createTransport(server);

            this.client = new Client(
                {
                    name: `doraemon-client-${server.server_id}`,
                    version: '1.0.0',
                },
                {
                    capabilities: {
                        tools: {},
                        prompts: {},
                        resources: {},
                    },
                }
            );

            await this.client.connect(this.transport);

            return true;
        } catch (error) {
            this.logger?.error(`MCP客户端连接失败 [${server.server_id}]:`, error);
            await this.close();
            throw error;
        }
    }

    /**
     * 创建传输层
     * @param {Object} server - 服务器配置
     * @returns {Promise<Transport>}
     */
    async createTransport(server) {
        let transport;

        if (server.transport === 'stdio') {
            transport = new StdioClientTransport({
                command: server.command,
                args: server.args || [],
                env: { ...process.env, ...(server.env || {}) },
                cwd: server.deploy_path,
            });
        } else if (server.transport === 'streamable-http') {
            transport = new StreamableHTTPClientTransport(new URL(server.http_url));
        } else if (server.transport === 'sse') {
            transport = new SSEClientTransport(new URL(server.sse_url));
        } else {
            throw new Error(`不支持的传输类型: ${server.transport}`);
        }

        return transport;
    }

    /**
     * 发送ping请求检查服务器状态
     * @param {number} timeout - 超时时间(毫秒)
     * @returns {Promise<{healthy: boolean, error?: string}>}
     */
    async ping(timeout = 15000) {
        if (!this.client) {
            return { healthy: false, error: '客户端未连接' };
        }

        try {
            const pingId = this.generateRequestId();
            const request = {
                jsonrpc: '2.0',
                id: pingId,
                method: 'ping',
            };

            await this.sendRequest(request, timeout);
            return { healthy: true };
        } catch (error) {
            return {
                healthy: false,
                error: `Ping失败: ${error.message}`,
            };
        }
    }

    /**
     * 获取服务器工具列表
     * @returns {Promise<Array>}
     */
    async listTools() {
        if (!this.client) {
            throw new Error('客户端未连接');
        }

        try {
            const response = await this.client.listTools();
            return response.tools || [];
        } catch (error) {
            this.logger?.warn('获取工具列表失败:', error);
            return [];
        }
    }

    /**
     * 获取服务器提示词列表
     * @returns {Promise<Array>}
     */
    async listPrompts() {
        if (!this.client) {
            throw new Error('客户端未连接');
        }

        try {
            const response = await this.client.listPrompts();
            return response.prompts || [];
        } catch (error) {
            this.logger?.warn('获取提示词列表失败:', error);
            return [];
        }
    }

    /**
     * 获取服务器资源列表
     * @returns {Promise<Array>}
     */
    async listResources() {
        if (!this.client) {
            throw new Error('客户端未连接');
        }

        try {
            const response = await this.client.listResources();
            return response.resources || [];
        } catch (error) {
            this.logger?.warn('获取资源列表失败:', error);
            return [];
        }
    }

    /**
     * 获取服务器能力信息
     * @returns {Promise<Object>}
     */
    async getServerCapabilities() {
        if (!this.client) {
            throw new Error('客户端未连接');
        }

        try {
            const capabilities = await this.client.getServerCapabilities();
            return capabilities || {};
        } catch (error) {
            this.logger?.warn('获取服务器能力失败:', error);
            return {};
        }
    }

    /**
     * 获取完整的服务器信息
     * @returns {Promise<Object>}
     */
    async getServerInfo() {
        const serverInfo = {
            tools: [],
            prompts: [],
            resources: [],
            capabilities: {},
        };

        try {
            // 并行获取所有信息
            const [tools, prompts, resources, capabilities] = await Promise.allSettled([
                this.listTools(),
                this.listPrompts(),
                this.listResources(),
                this.getServerCapabilities(),
            ]);

            if (tools.status === 'fulfilled') {
                serverInfo.tools = tools.value;
            }

            if (prompts.status === 'fulfilled') {
                serverInfo.prompts = prompts.value;
            }

            if (resources.status === 'fulfilled') {
                serverInfo.resources = resources.value;
            }

            if (capabilities.status === 'fulfilled') {
                serverInfo.capabilities = capabilities.value;
            }

            return serverInfo;
        } catch (error) {
            this.logger?.error('获取服务器信息失败:', error);
            throw error;
        }
    }

    /**
     * 发送自定义请求
     * @param {Object} request - JSON-RPC请求对象
     * @param {number} timeout - 超时时间
     * @returns {Promise<any>}
     */
    async sendRequest(request, timeout = 15000) {
        if (!this.client || !this.transport) {
            throw new Error('客户端未连接');
        }

        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                reject(new Error('请求时间超时，请重试'));
            }, timeout);

            // 设置消息处理器
            const messageHandler = (message) => {
                if (message.id === request.id) {
                    clearTimeout(timeoutHandle);

                    if (message.error) {
                        reject(new Error(message.error.message || '服务器返回错误'));
                    } else {
                        resolve(message.result || {});
                    }
                }
            };

            // 设置临时消息处理器
            if (this.transport.onmessage) {
                const originalHandler = this.transport.onmessage;
                this.transport.onmessage = (message) => {
                    messageHandler(message);
                    originalHandler(message);
                };
            } else {
                this.transport.onmessage = messageHandler;
            }

            // 发送请求
            this.transport.send(request).catch((error) => {
                clearTimeout(timeoutHandle);
                reject(error);
            });
        });
    }

    /**
     * 生成请求ID
     * @returns {string}
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 关闭客户端连接
     */
    async close() {
        if (this.client) {
            try {
                await this.client.close();
            } catch (error) {
                this.logger?.warn('关闭MCP客户端连接失败:', error);
            } finally {
                this.client = null;
                this.transport = null;
            }
        }
    }

    /**
     * 检查客户端是否已连接
     * @returns {boolean}
     */
    isConnected() {
        return this.client !== null;
    }
}

module.exports = { MCPClient };
