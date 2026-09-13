module.exports = (app) => {
    const autoSyncInterval = app.config.agentMarket?.autoSyncInterval;
    return {
        schedule: {
            interval: autoSyncInterval || '5m',
            type: 'worker', // 仅由单个 worker 执行，避免多 worker 并发冲突
            immediate: false, // 应用启动后等待到达周期再执行
            disable: !autoSyncInterval || autoSyncInterval === '0',
        },
        // 定时轮询同步所有已配置 GitLab 仓库的 Agent 插件
        async task(ctx) {
            try {
                ctx.logger.info('[schedule:syncGitAgents] 开始执行 Agent 仓库定时同步');
                const results = await ctx.service.agents.syncAllGitAgents();
                const successCount = results.filter((item) => item.success).length;
                const changedCount = results.filter((item) => item.isContentChanged).length;
                ctx.logger.info(
                    `[schedule:syncGitAgents] 同步执行完成: 总数 ${results.length}，成功 ${successCount}，有代码变动 ${changedCount}`
                );
            } catch (error) {
                ctx.logger.error(`[schedule:syncGitAgents] 定时同步异常: ${error.message}`);
            }
        },
    };
};
