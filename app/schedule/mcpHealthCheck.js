const Subscription = require('egg').Subscription;

/**
 * MCP服务器健康检查定时任务
 * 每小时检查一次所有启用的MCP服务器状态
 */
class MCPHealthCheck extends Subscription {
    /**
     * 定时任务配置
     */
    static get schedule() {
        return {
            cron: '0 0 */12 * * *', // 每12小时检测一次
            type: 'worker', // 指定一个 worker 执行
            immediate: false, // 应用启动后不立即执行
            disable: false,
        };
    }

    /**
     * 执行定时任务
     */
    async subscribe() {
        const { ctx } = this;

        try {
            ctx.logger.info('开始执行MCP服务器健康检查定时任务');

            // 调用服务方法检查所有服务器健康状态
            await ctx.service.mcp.checkAllServersHealth();

            ctx.logger.info('MCP服务器健康检查定时任务执行完成');
        } catch (error) {
            ctx.logger.error('MCP服务器健康检查定时任务执行失败:', error);
        }
    }
}

module.exports = MCPHealthCheck;
