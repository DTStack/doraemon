const { MCPProxy } = require('../mcp/mcpProxy');
const getRawBody = require('raw-body');
const contentType = require('content-type');

/**
 * Agent进程的MCP HTTP请求处理器
 */
class MCPHttpHandler {
    constructor(agent) {
        this.agent = agent;
        this.logger = agent.logger;
    }

    /**
     * 处理HTTP请求
     * @param {http.IncomingMessage} req - 原生HTTP请求对象
     * @param {http.ServerResponse} res - 原生HTTP响应对象
     */
    async handleRequest(req, res) {
        try {
            const parsedUrl = new URL(req.url, 'http://localhost');
            const pathname = parsedUrl.pathname;

            // 将查询参数转换为对象
            const query = {};
            parsedUrl.searchParams.forEach((value, key) => {
                query[key] = value;
            });
            req.query = query;

            // 处理/mcp-endpoint/:serverId/*路径 - MCP代理端点
            if (pathname.startsWith('/mcp-endpoint/')) {
                return await this.handleMCPEndpoint(req, res, pathname);
            }

            // 其他路径返回404
            this.sendResponse(res, 404, { error: 'Not Found' });
        } catch (error) {
            this.logError('HTTP请求处理失败:', error);
            this.sendResponse(res, 500, {
                error: error.message || 'Internal Server Error',
            });
        }
    }

    /**
     * 处理MCP代理端点请求
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {string} pathname
     */
    async handleMCPEndpoint(req, res, pathname) {
        // 解析路径: /mcp-endpoint/:serverId/...
        const pathParts = pathname.split('/');
        if (pathParts.length < 3) {
            return this.sendResponse(res, 400, { error: 'Invalid endpoint path' });
        }

        const serverId = pathParts[2];
        if (!serverId) {
            return this.sendResponse(res, 400, { error: 'Server ID is required' });
        }

        // 转发到MCPProxy
        try {
            if (req.method === 'POST') {
                const body = await getRawBody(req, {
                    length: req.headers['content-length'],
                    // 也许存在blob资源，需要设置较大的值
                    limit: '100mb',
                    encoding:
                        req.method === 'POST' ? contentType.parse(req).parameters.charset : 'utf-8',
                });
                req.body = JSON.parse(body);

                // 调用埋点
                this.agent.messenger.sendRandom('mcpTraceRequest', {
                    serverId,
                    data: req.body,
                });
            }

            const mcpProxy = MCPProxy.getInstance();
            await mcpProxy.forwardRequest(serverId, req, res);
        } catch (error) {
            this.logError(`MCP请求转发失败 [${serverId}]:`, error);
            if (!res.headersSent) {
                this.sendResponse(res, 500, { error: error.message });
            }
        }
    }

    /**
     * 发送响应
     * @param {http.ServerResponse} res
     * @param {number} statusCode
     * @param {any} data
     */
    sendResponse(res, statusCode, data) {
        if (!res.headersSent) {
            res.statusCode = statusCode;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
        }
    }

    /**
     * 日志输出
     */
    log(...args) {
        if (this.logger && this.logger.info) {
            this.logger.info(...args);
        } else {
            console.log('[MCPHttpHandler]', ...args);
        }
    }

    /**
     * 错误日志输出
     */
    logError(...args) {
        if (this.logger && this.logger.error) {
            this.logger.error(...args);
        } else {
            console.error('[MCPHttpHandler Error]', ...args);
        }
    }
}

module.exports = { MCPHttpHandler };
