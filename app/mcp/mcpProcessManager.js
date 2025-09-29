const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

/**
 * MCP进程管理器
 * 基于MCP SDK管理客户端连接的生命周期
 */
class MCPProcessManager {
    constructor(logger) {
        this.mcpTransports = new Map();
        this.serverConfigs = new Map();
        this.logger = logger;
    }

    async createStdioProcess(serverId, config) {
        if (!config.command) {
            throw new Error(`服务器 ${serverId} 的 stdio 传输需要指定 command 字段`);
        }

        await this.stopStdioProcess(serverId);

        this.logger?.info(`创建MCP客户端连接: ${serverId}`);

        const transport = new StdioClientTransport({
            command: config.command,
            args: config.args || [],
            env: { ...process.env, ...(config.env || {}) },
            cwd: config.cwd || process.cwd(),
        });

        this.mcpTransports.set(serverId, transport);
        this.serverConfigs.set(serverId, config);

        await transport.start();

        this.logger?.info(`MCP客户端连接成功: ${serverId}`);

        return transport;
    }

    async sendMessage(serverId, message) {
        const transport = this.mcpTransports.get(serverId);
        if (!transport || !transport.pid) {
            this.logger?.error(`MCP客户端 ${serverId} 不存在或未连接`);
            return false;
        }

        try {
            // 解析消息数据
            let messageObject;
            if (typeof message === 'string') {
                messageObject = JSON.parse(message);
            } else {
                messageObject = message;
            }

            // 使用MCP客户端发送请求
            await transport.send(messageObject);
        } catch (error) {
            this.logger?.error(`向MCP服务器 ${serverId} 发送消息失败:`, error);
            throw error;
        }
    }

    async stopStdioProcess(serverId) {
        const transport = this.mcpTransports.get(serverId);
        if (!transport) {
            return;
        }

        this.logger?.info(`断开MCP客户端连接: ${serverId}`);

        try {
            await transport.close();
        } catch (error) {
            this.logger?.warn(`关闭MCP客户端连接失败 [${serverId}]:`, error.message);
        }

        this.mcpTransports.delete(serverId);
        this.serverConfigs.delete(serverId);
    }

    isProcessRunning(serverId) {
        const transport = this.mcpTransports.get(serverId);
        return transport ? !!transport.pid : false;
    }

    async restartStdioProcess(serverId) {
        const config = this.serverConfigs.get(serverId);
        if (!config) {
            throw new Error(`服务器 ${serverId} 的配置不存在`);
        }

        await this.stopStdioProcess(serverId);
        await this.createStdioProcess(serverId, config);
    }

    async cleanup() {
        const serverIds = Array.from(this.mcpTransports.keys());
        await Promise.all(serverIds.map((serverId) => this.stopStdioProcess(serverId)));
    }
}

module.exports = { MCPProcessManager };
