const Controller = require('egg').Controller;

class AgentsController extends Controller {
    async getAgentList() {
        const data = await this.ctx.service.agents.queryAgentList(this.ctx.query);
        this.ctx.body = this.app.utils.response(true, data);
    }

    async getAgentDetail() {
        const data = await this.ctx.service.agents.getAgentDetail(this.ctx.query.name);
        this.ctx.body = this.app.utils.response(true, data);
    }

    async getAgentAsset() {
        const { stream, mimeType, cacheControl } =
            await this.ctx.service.agents.getAgentAssetStream(this.ctx.query);
        this.ctx.set('Content-Type', mimeType);
        this.ctx.set('Cache-Control', cacheControl);
        this.ctx.body = stream;
    }

    async downloadAgentArchive() {
        const { stream, fileName, mimeType } = await this.ctx.service.agents.getAgentArchiveStream(
            this.ctx.query.name
        );
        this.ctx.set('Content-Type', mimeType);
        this.ctx.set('Content-Disposition', `attachment; filename="${fileName}"`);
        this.ctx.body = stream;
    }

    async getRelatedAgents() {
        const { name, limit = 3 } = this.ctx.query;
        const data = await this.ctx.service.agents.getRelatedAgents(name, limit);
        this.ctx.body = this.app.utils.response(true, data);
    }

    async deleteAgent() {
        const data = await this.ctx.service.agents.deleteAgent(this.ctx.request.body || {});
        this.ctx.body = this.app.utils.response(true, data);
    }
    // 从指定 GitLab 仓库导入 Agent
    async importAgentFromGit() {
        const { gitUrl, gitBranch, category } = this.ctx.request.body || {};
        if (!gitUrl) {
            this.ctx.throw(400, '缺少 gitUrl 参数');
        }
        const data = await this.ctx.service.agents.importAgentFromGit(
            gitUrl,
            gitBranch || 'master',
            category
        );
        this.ctx.body = this.app.utils.response(true, data);
    }

    // 同步 Git 仓库代码，支持按 name 单独同步或全量同步
    async syncGitAgents() {
        const { name } = this.ctx.request.body || {};
        if (name) {
            // 单独同步单个 Agent
            const data = await this.ctx.service.agents.syncGitAgentByName(name);
            this.ctx.body = this.app.utils.response(true, data);
            return;
        }
        const data = await this.ctx.service.agents.syncAllGitAgents();
        this.ctx.body = this.app.utils.response(true, data);
    }

    // 更新 Agent 的 Git 仓库配置，支持可选立即同步
    async updateAgentGitConfig() {
        const { name, gitUrl, gitBranch, category, syncNow } = this.ctx.request.body || {};
        if (!name) {
            this.ctx.throw(400, '缺少 name 参数');
        }
        const data = await this.ctx.service.agents.updateAgentGitConfig({
            name,
            gitUrl,
            gitBranch,
            category,
            syncNow: Boolean(syncNow),
        });
        this.ctx.body = this.app.utils.response(true, data);
    }
}

module.exports = AgentsController;
