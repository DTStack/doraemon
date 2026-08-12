const Controller = require('egg').Controller;
const fs = require('fs');

class AgentsController extends Controller {
    async getAgentList() {
        const data = await this.ctx.service.agents.queryAgentList(this.ctx.query);
        this.ctx.body = this.app.utils.response(true, data);
    }

    async getAgentDetail() {
        const data = await this.ctx.service.agents.getAgentDetail(this.ctx.query.name);
        this.ctx.body = this.app.utils.response(true, data);
    }

    async getRelatedAgents() {
        const { name, limit = 3 } = this.ctx.query;
        const data = await this.ctx.service.agents.getRelatedAgents(name, limit);
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

    async importAgentFile() {
        const files = this.ctx.request.files
            ? Array.isArray(this.ctx.request.files)
                ? this.ctx.request.files
                : [this.ctx.request.files]
            : [];
        const file = files[0];

        if (!file) {
            this.ctx.throw(400, '缺少上传文件');
        }

        try {
            const data = await this.ctx.service.agents.importAgentFile(
                this.ctx.request.body || {},
                file
            );
            this.ctx.body = this.app.utils.response(true, data);
        } finally {
            if (file?.filepath && fs.existsSync(file.filepath)) {
                try {
                    fs.unlinkSync(file.filepath);
                } catch (error) {
                    this.ctx.logger.warn(`[agents] 清理上传文件失败: ${error.message}`);
                }
            }
        }
    }

    async deleteAgent() {
        const data = await this.ctx.service.agents.deleteAgent(this.ctx.request.body || {});
        this.ctx.body = this.app.utils.response(true, data);
    }
}

module.exports = AgentsController;
