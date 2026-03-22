const Service = require('egg').Service;

class SkillLikeService extends Service {
    async ensureStorageReady() {
        const { SkillLike, SkillsItem } = this.app.model;
        if (!SkillLike || !SkillsItem) {
            this.ctx.throw(500, 'SkillLike 数据模型未加载');
        }
        await SkillLike.sync();
    }

    resolveClientIp() {
        const headers = this.ctx.request.headers;
        const ip = headers['x-forwarded-for']?.split(',')[0]?.trim()
            || headers['x-real-ip']
            || this.ctx.ip
            || '';
        return String(ip).trim();
    }

    async getSkillBySlug(slug) {
        const { SkillsItem } = this.app.model;
        const skill = await SkillsItem.findOne({
            where: { slug, is_delete: 0 },
        });
        return skill;
    }

    async like(skillSlug, ip) {
        await this.ensureStorageReady();
        const { SkillLike } = this.app.model;

        const skill = await this.getSkillBySlug(skillSlug);
        if (!skill) {
            this.ctx.throw(404, '技能不存在');
        }

        const existing = await SkillLike.findOne({
            where: { skill_id: skill.id, ip },
        });

        if (existing) {
            return { liked: true, message: '已经点赞过了' };
        }

        await SkillLike.create({
            skill_id: skill.id,
            ip,
        });

        const likeCount = await SkillLike.count({
            where: { skill_id: skill.id },
        });

        await skill.update({ stars: likeCount });

        return { liked: true, likeCount };
    }

    async unlike(skillSlug, ip) {
        await this.ensureStorageReady();
        const { SkillLike } = this.app.model;

        const skill = await this.getSkillBySlug(skillSlug);
        if (!skill) {
            this.ctx.throw(404, '技能不存在');
        }

        const existing = await SkillLike.findOne({
            where: { skill_id: skill.id, ip },
        });

        if (!existing) {
            return { liked: false, message: '还未点赞' };
        }

        await existing.destroy();

        const likeCount = await SkillLike.count({
            where: { skill_id: skill.id },
        });

        await skill.update({ stars: likeCount });

        return { liked: false, likeCount };
    }

    async getLikeStatus(skillSlug, ip) {
        await this.ensureStorageReady();
        const { SkillLike } = this.app.model;

        const skill = await this.getSkillBySlug(skillSlug);
        if (!skill) {
            this.ctx.throw(404, '技能不存在');
        }

        const existing = await SkillLike.findOne({
            where: { skill_id: skill.id, ip },
        });

        const likeCount = await SkillLike.count({
            where: { skill_id: skill.id },
        });

        return {
            liked: !!existing,
            likeCount,
        };
    }
}

module.exports = SkillLikeService;
