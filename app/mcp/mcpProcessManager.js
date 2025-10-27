const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

/**
 * MCP进程管理器
 */
class MCPProcessManager {
    constructor(logger) {
        this.mcpTransports = new Map();
        this.serverConfigs = new Map();
        this.logger = logger;
    }

    async createStdioProcess(serverId, config) {
        if (!config.command) {
            const error = new Error(`服务器 ${serverId} 的 stdio 传输需要指定 command 字段`);
            this.logger?.error(`创建进程失败 [${serverId}]: 缺少command`);
            throw error;
        }

        await this.stopStdioProcess(serverId);

        try {
            const transport = new StdioClientTransport({
                command: config.command,
                args: config.args || [],
                env: { ...process.env, ...(config.env || {}) },
                cwd: config.cwd || process.cwd(),
            });

            this.mcpTransports.set(serverId, transport);
            this.serverConfigs.set(serverId, config);

            await transport.start();

            return transport;
        } catch (error) {
            this.logger?.error(`启动进程失败 [${serverId}]:`, error);
            throw error;
        }
    }

    async sendMessage(serverId, message) {
        const transport = this.mcpTransports.get(serverId);
        if (!transport || !transport.pid) {
            this.logger?.error(`MCP客户端未连接 [${serverId}]`);
            return false;
        }

        try {
            // 解析消息数据
            let messageObject;
            if (typeof message === 'string') {
                try {
                    messageObject = JSON.parse(message);
                } catch (parseError) {
                    this.logger?.error(`消息格式错误 [${serverId}]`);
                    throw new Error('消息格式错误，无法解析JSON');
                }
            } else {
                messageObject = message;
            }

            // 使用MCP客户端发送请求
            await transport.send(messageObject);

            return true;
        } catch (error) {
            this.logger?.error(`向MCP服务器发送消息失败 [${serverId}]:`, error);
            throw error;
        }
    }

    async stopStdioProcess(serverId) {
        const transport = this.mcpTransports.get(serverId);
        if (!transport) {
            return;
        }

        try {
            await transport.close();
        } catch (error) {
            this.logger?.warn(`关闭MCP客户端连接失败 [${serverId}]:`, error);
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
            const error = new Error(`服务器 ${serverId} 的配置不存在`);
            this.logger?.error(`重启失败 [${serverId}]: 配置不存在`);
            throw error;
        }

        try {
            await this.stopStdioProcess(serverId);
            await this.createStdioProcess(serverId, config);
        } catch (error) {
            this.logger?.error(`重启失败 [${serverId}]:`, error);
            throw error;
        }
    }

    async cleanup() {
        const serverIds = Array.from(this.mcpTransports.keys());
        const count = serverIds.length;

        if (count === 0) {
            return;
        }

        try {
            await Promise.all(serverIds.map((serverId) => this.stopStdioProcess(serverId)));
        } catch (error) {
            this.logger?.error('清理进程失败:', error);
            throw error;
        }
    }
}

module.exports = { MCPProcessManager };
