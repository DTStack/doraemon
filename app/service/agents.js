const Service = require('egg').Service;
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const { normalizeRelativePath, extractSkillMdName } = require('../utils/skill-utils');
const { resolveSkillIdentifier, sanitizeInstallKeySegment } = require('../utils/skill-install-key');
const {
    isValidSkillCategory,
    SKILL_CATEGORY_OPTIONS,
} = require('../../contracts/skill-categories');

const AGENT_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const GIT_BRANCH_PATTERN = /^[a-zA-Z0-9_][a-zA-Z0-9_.\-/]*$/;
const DEFAULT_GIT_TIMEOUT_MS = 60000;

// 正在执行 Git 同步的仓库集合，防止并发执行导致 index.lock 冲突
const activeSyncRepos = new Set();

class AgentsService extends Service {
    constructor(ctx) {
        super(ctx);
        this.storageReady = false;
        this.storageReadyPromise = null;
    }

    getAgentMarketConfig() {
        return {
            storageDir: '/data/doraemon/agent-market',
            ...this.app.config.agentMarket,
        };
    }

    async ensureStorageReady() {
        if (this.storageReady) return;
        if (this.storageReadyPromise) {
            await this.storageReadyPromise;
            return;
        }

        this.storageReadyPromise = (async () => {
            const { Agent, AgentSkill } = this.app.model;
            if (!Agent || !AgentSkill) {
                this.ctx.throw(500, 'Agent 数据模型未加载');
            }

            await Agent.sync();
            await AgentSkill.sync();
            await this.ensureAgentSkillsTableCompatible();
            await this.ensureAgentsTableCompatible();
            this.storageReady = true;
        })();

        try {
            await this.storageReadyPromise;
        } finally {
            this.storageReadyPromise = null;
        }
    }

    // 兼容历史 agent_skills 表结构，若存在 relation_type 且非空则修改为允许 NULL
    async ensureAgentSkillsTableCompatible() {
        try {
            const queryInterface = this.app.model?.getQueryInterface?.();
            if (!queryInterface?.describeTable || !queryInterface?.changeColumn) return;
            const table = await queryInterface.describeTable('agent_skills');
            if (table?.relation_type && !table.relation_type.allowNull) {
                await queryInterface.changeColumn('agent_skills', 'relation_type', {
                    type: this.app.Sequelize.STRING(20),
                    allowNull: true,
                    defaultValue: null,
                    comment: '历史兼容字段',
                });
            }
        } catch (error) {
            this.ctx?.logger?.warn?.(`[agents] 兼容检查 agent_skills 表结构失败: ${error.message}`);
        }
    }

    // 兼容历史 agents 表结构，添加 git_url 和 git_branch
    async ensureAgentsTableCompatible() {
        try {
            const queryInterface = this.app.model?.getQueryInterface?.();
            if (!queryInterface?.describeTable || !queryInterface?.addColumn) return;
            const table = await queryInterface.describeTable('agents');
            if (!table?.git_url) {
                await queryInterface.addColumn('agents', 'git_url', {
                    type: this.app.Sequelize.STRING(1000),
                    allowNull: true,
                    comment: 'GitLab 仓库地址',
                });
            }
            if (!table?.git_branch) {
                await queryInterface.addColumn('agents', 'git_branch', {
                    type: this.app.Sequelize.STRING(100),
                    allowNull: true,
                    comment: 'GitLab 仓库分支',
                });
            }
            if (!table?.last_git_refresh_at) {
                await queryInterface.addColumn('agents', 'last_git_refresh_at', {
                    type: this.app.Sequelize.DATE,
                    allowNull: true,
                    comment: '最近一次刷新/检查 Git 时间',
                });
            }
            if (!table?.last_git_sync_at) {
                await queryInterface.addColumn('agents', 'last_git_sync_at', {
                    type: this.app.Sequelize.DATE,
                    allowNull: true,
                    comment: '最近一次代码变动同步时间',
                });
            }
            if (table?.logo_size && table.logo_size.allowNull === false) {
                await queryInterface.changeColumn('agents', 'logo_size', {
                    type: this.app.Sequelize.INTEGER,
                    allowNull: true,
                    comment: 'Logo 大小',
                });
            }
        } catch (error) {
            this.ctx?.logger?.warn?.(`[agents] 兼容检查 agents 表结构失败: ${error.message}`);
        }
    }

    normalizeAgentPath(filePath, message = '非法文件路径') {
        const normalized = normalizeRelativePath(String(filePath || '').replace(/^\.\//, ''));
        if (!normalized) {
            this.ctx.throw(400, message);
        }
        return normalized;
    }

    parseJsonArray(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value !== 'string') return [];

        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    validateAgentName(name) {
        const value = String(name || '').trim();
        if (!AGENT_NAME_PATTERN.test(value) || value.length > 100) {
            this.ctx.throw(400, 'metadata.name 格式无效');
        }
        return value;
    }

    validateAgentVersion(version) {
        const value = String(version || '').trim();
        if (!SEMVER_PATTERN.test(value)) {
            this.ctx.throw(400, 'metadata.version 必须是有效的 SemVer 格式');
        }
        return value;
    }

    buildAssetUrl(agentName, assetPath) {
        return `/api/agents/asset?name=${encodeURIComponent(agentName)}&path=${encodeURIComponent(
            assetPath
        )}`;
    }

    parseCodexPluginJson(rawContent) {
        try {
            return JSON.parse(rawContent);
        } catch (error) {
            this.ctx.throw(400, `.codex-plugin/plugin.json 解析失败: ${error.message}`);
        }
    }

    parseClaudePluginJson(rawContent) {
        try {
            return JSON.parse(rawContent);
        } catch (error) {
            this.ctx.throw(400, `.claude-plugin/plugin.json 解析失败: ${error.message}`);
        }
    }

    normalizeCapabilities(capabilities) {
        if (!Array.isArray(capabilities)) return [];

        return capabilities
            .map((item) => {
                if (typeof item === 'string') {
                    return {
                        id: '',
                        name: item.trim(),
                        description: '',
                    };
                }
                if (item && typeof item === 'object') {
                    return {
                        id: String(item.id || '').trim(),
                        name: String(item.name || item.description || '').trim(),
                        description: String(item.description || '').trim(),
                    };
                }
                return null;
            })
            .filter((item) => item && item.name);
    }

    mapCodexCategory(codexCategory) {
        const map = {
            Coding: '工程效率',
        };
        const mapped = map[String(codexCategory || '').trim()];
        return mapped && isValidSkillCategory(mapped) ? mapped : '通用';
    }

    normalizeManifestPath(value, message) {
        const normalized = String(value || '').trim();
        if (!normalized.startsWith('./')) {
            this.ctx.throw(400, `${message} 必须是 ./ 开头的相对路径`);
        }
        // manifest 目录路径可能带末尾斜杠，统一后再拼接子路径，避免出现 skills//xxx
        return this.normalizeAgentPath(normalized.slice(2), message).replace(/\/+$/, '');
    }

    validateCodexManifest(manifest) {
        if (!manifest || typeof manifest !== 'object') {
            this.ctx.throw(400, '.codex-plugin/plugin.json 内容无效');
        }

        const iface = manifest.interface || {};

        const name = this.validateAgentName(manifest.name);
        const version = this.validateAgentVersion(manifest.version);

        const displayName = String(iface.displayName || manifest.name || '').trim();
        if (!displayName) {
            this.ctx.throw(400, 'interface.displayName 不能为空');
        }

        const description = String(manifest.description || '').trim();
        if (!description) {
            this.ctx.throw(400, 'description 不能为空');
        }

        const authorName = String((manifest.author || {}).name || iface.developerName || '').trim();
        if (!authorName) {
            this.ctx.throw(400, 'author.name 不能为空');
        }

        const category = this.mapCodexCategory(iface.category);
        const longDescription = String(iface.longDescription || description || '').trim();
        const defaultPrompt = Array.isArray(iface.defaultPrompt) ? iface.defaultPrompt : [];
        if (defaultPrompt.length > 5) {
            this.ctx.throw(400, 'interface.defaultPrompt 最多支持 5 条');
        }
        if (defaultPrompt.some((item) => typeof item !== 'string' || item.length > 1024)) {
            this.ctx.throw(400, 'interface.defaultPrompt 每条必须是 1024 字符以内的字符串');
        }

        const skills = this.normalizeManifestPath(manifest.skills, 'skills');
        const logoRef = iface.logo ? this.normalizeManifestPath(iface.logo, 'interface.logo') : '';

        return {
            name,
            displayName,
            version,
            description,
            authorName,
            category,
            keywords: Array.isArray(manifest.keywords)
                ? manifest.keywords.map((item) => String(item))
                : [],
            longDescription,
            defaultPrompt,
            capabilities: this.normalizeCapabilities(iface.capabilities),
            skills,
            logoRef,
        };
    }

    validateClaudeManifest(manifest) {
        if (!manifest || typeof manifest !== 'object') {
            this.ctx.throw(400, '.claude-plugin/plugin.json 内容无效');
        }

        const name = this.validateAgentName(manifest.name);
        const version = manifest.version ? this.validateAgentVersion(manifest.version) : '';
        const agents = Array.isArray(manifest.agents) ? manifest.agents : [];
        if (agents.length === 0) {
            this.ctx.throw(400, '.claude-plugin/plugin.json 必须声明 agents');
        }

        return {
            name,
            version,
            agents: agents.map((item) => this.normalizeManifestPath(item, 'agents')),
        };
    }

    // 递归删除指定路径目录
    removeDirectory(targetPath) {
        if (!targetPath || !fs.existsSync(targetPath)) return;
        fs.rmSync(targetPath, { recursive: true, force: true });
    }

    toAgentListItem(row, skillCount = 0) {
        const resolvedSkillCount =
            skillCount !== undefined && skillCount !== null
                ? Number(skillCount)
                : Number(row.skillCount || 0);

        return {
            name: row.name,
            displayName: row.display_name,
            description: row.description || '',
            authorName: row.author_name || '',
            category: row.category || '通用',
            tags: this.parseJsonArray(row.tags),
            version: row.version || '',
            updatedAt: row.updated_at
                ? typeof row.updated_at === 'string'
                    ? row.updated_at
                    : row.updated_at.toISOString()
                : '',
            logoUrl: row.logo_path ? this.buildAssetUrl(row.name, row.logo_path) : '',
            skillCount: resolvedSkillCount,
            gitUrl: row.git_url || '',
            gitBranch: row.git_branch || '',
            lastGitRefreshAt: row.last_git_refresh_at
                ? typeof row.last_git_refresh_at === 'string'
                    ? row.last_git_refresh_at
                    : row.last_git_refresh_at.toISOString()
                : row.updated_at
                ? typeof row.updated_at === 'string'
                    ? row.updated_at
                    : row.updated_at.toISOString()
                : '',
            lastGitSyncAt: row.last_git_sync_at
                ? typeof row.last_git_sync_at === 'string'
                    ? row.last_git_sync_at
                    : row.last_git_sync_at.toISOString()
                : row.updated_at
                ? typeof row.updated_at === 'string'
                    ? row.updated_at
                    : row.updated_at.toISOString()
                : '',
        };
    }

    async queryAgentList(params = {}) {
        await this.ensureStorageReady();
        const { Agent } = this.app.model;
        const keyword = String(params.keyword || '').trim();
        const category = String(params.category || '').trim();
        const pageNum = Math.max(Number(params.pageNum) || 1, 1);
        const pageSize = Math.max(Number(params.pageSize) || 12, 1);
        const { Op } = this.app.Sequelize;
        const where = {
            is_delete: 0,
        };

        if (category) {
            where.category = category;
        }

        if (keyword) {
            where[Op.or] = [
                { name: { [Op.like]: `%${keyword}%` } },
                { display_name: { [Op.like]: `%${keyword}%` } },
                { description: { [Op.like]: `%${keyword}%` } },
                { author_name: { [Op.like]: `%${keyword}%` } },
                { tags: { [Op.like]: `%${keyword}%` } },
            ];
        }

        // 按 Agent 名称（display_name / name）首字母升序排序
        const { count, rows } = await Agent.findAndCountAll({
            where,
            order: [
                ['display_name', 'ASC'],
                ['name', 'ASC'],
                ['id', 'ASC'],
            ],
            offset: (pageNum - 1) * pageSize,
            limit: pageSize,
        });

        // 批量查询当前页 Agent 关联的 Skill 数量
        const agentIds = rows
            .map((row) => (row?.id ? row.id : row?.toJSON ? row.toJSON().id : undefined))
            .filter(Boolean);
        const skillCountMap = new Map();
        if (agentIds.length > 0) {
            const { AgentSkill } = this.app.model;
            if (AgentSkill) {
                try {
                    const skillRows = await AgentSkill.findAll({
                        where: { agent_id: agentIds },
                        attributes: ['agent_id', 'skill_slug'],
                    });
                    const skillSetMap = new Map();
                    skillRows.forEach((item) => {
                        const id = item.agent_id;
                        if (!skillSetMap.has(id)) {
                            skillSetMap.set(id, new Set());
                        }
                        if (item.skill_slug) {
                            skillSetMap.get(id).add(item.skill_slug);
                        }
                    });
                    skillSetMap.forEach((set, id) => {
                        skillCountMap.set(id, set.size);
                    });
                } catch (error) {
                    this.app.logger?.warn?.(`[agents] 查询 Agent 技能统计失败: ${error.message}`);
                }
            }
        }

        const list = rows.map((row) => {
            const rowData = row.toJSON ? row.toJSON() : row;
            const skillCount = skillCountMap.get(rowData.id) || 0;
            return this.toAgentListItem(rowData, skillCount);
        });

        return {
            list,
            total: count,
            pageNum,
            pageSize,
            categories: [...SKILL_CATEGORY_OPTIONS],
        };
    }

    // 用 Agent 关联的 skill 标识匹配 skill 市场，返回命中的 skill 或 null
    // 优先精确匹配 slug/installKey，再尝试 sanitize 后的小写连字符形式（覆盖 SKILL.md name 与市场 name 不一致的情形）
    matchMarketSkill(identifier, skillCache) {
        if (!skillCache) return null;
        const value = String(identifier || '').trim();
        if (!value) return null;

        const matched = resolveSkillIdentifier(value, skillCache);
        if (matched) return matched;

        const sanitized = sanitizeInstallKeySegment(value);
        if (sanitized && sanitized !== value) {
            return resolveSkillIdentifier(sanitized, skillCache) || null;
        }
        return null;
    }

    async getAgentDetail(name) {
        await this.ensureStorageReady();
        const { Agent } = this.app.model;
        const row = await Agent.findOne({
            where: {
                name,
                is_delete: 0,
            },
        });
        if (!row) {
            this.ctx.throw(404, 'Agent 不存在');
        }

        const detail = row.toJSON();

        // 读取 Agent 关联的 Skill，并判断是否已收录到 skill 市场（可点击跳转）
        let skills = [];
        const { AgentSkill } = this.app.model;
        const skillRows = await AgentSkill.findAll({
            where: { agent_id: row.id },
            order: [['id', 'ASC']],
        });
        if (skillRows.length > 0) {
            let skillCache = null;
            try {
                skillCache = await this.ctx.service.skills.ensureSkillCache();
            } catch (error) {
                this.app.logger.warn(
                    `[agents] 加载 skill 市场缓存失败，Agent(${name}) skills 降级为未收录: ${error.message}`
                );
            }
            skills = skillRows.map((item) => {
                const identifier = item.skill_slug;
                const matched = this.matchMarketSkill(identifier, skillCache);
                if (matched) {
                    return {
                        slug: matched.slug,
                        installKey: matched.installKey || matched.slug,
                        name: matched.name || identifier,
                        description: matched.description || '',
                        isPackage: matched.isPackage ? 1 : 0,
                        parentSlug: matched.parentSlug || null,
                        installed: true,
                    };
                }
                return {
                    slug: identifier,
                    installKey: identifier,
                    name: identifier,
                    description: '',
                    isPackage: 0,
                    parentSlug: null,
                    installed: false,
                };
            });
        }

        return {
            name: detail.name,
            displayName: detail.display_name,
            description: detail.description || '',
            longDescription: detail.profile || detail.description || '',
            authorName: detail.author_name || '',
            category: detail.category || '通用',
            tags: this.parseJsonArray(detail.tags),
            defaultPrompt: this.parseJsonArray(detail.prompts),
            capabilities: this.normalizeCapabilities(this.parseJsonArray(detail.capabilities)),
            version: detail.version || '',
            logoUrl: detail.logo_path ? this.buildAssetUrl(detail.name, detail.logo_path) : '',
            updatedAt: detail.updated_at ? detail.updated_at.toISOString() : '',
            skills,
            skillCount: skills.length,
            gitUrl: detail.git_url || '',
            gitBranch: detail.git_branch || '',
            lastGitRefreshAt: detail.last_git_refresh_at
                ? typeof detail.last_git_refresh_at === 'string'
                    ? detail.last_git_refresh_at
                    : detail.last_git_refresh_at.toISOString()
                : detail.updated_at
                ? typeof detail.updated_at === 'string'
                    ? detail.updated_at
                    : detail.updated_at.toISOString()
                : '',
            lastGitSyncAt: detail.last_git_sync_at
                ? typeof detail.last_git_sync_at === 'string'
                    ? detail.last_git_sync_at
                    : detail.last_git_sync_at.toISOString()
                : detail.updated_at
                ? typeof detail.updated_at === 'string'
                    ? detail.updated_at
                    : detail.updated_at.toISOString()
                : '',
        };
    }

    // 根据 Agent 关联的 Skill 重叠度推荐相关 Agent（共同 skill 越多越相关）
    async getRelatedAgents(name, limit = 3) {
        await this.ensureStorageReady();
        const nameValue = String(name || '').trim();
        const { Agent, AgentSkill } = this.app.model;
        const target = await Agent.findOne({
            where: {
                name: nameValue,
                is_delete: 0,
            },
        });
        if (!target) {
            this.ctx.throw(404, 'Agent 不存在');
        }

        const safeLimit = Math.max(Number(limit) || 3, 1);
        // 先查询当前 Agent 关联的技能，若无技能则无需进一步查询其他 Agent
        const targetSkillRows = await AgentSkill.findAll({
            where: { agent_id: target.id },
            attributes: ['skill_slug'],
        });
        if (targetSkillRows.length === 0) {
            return [];
        }

        const targetSkills = new Set(targetSkillRows.map((item) => item.skill_slug));
        const { Op } = this.app.Sequelize || {};
        const neOp = Op?.ne || '$ne';

        // 仅根据共同技能和非当前 Agent 过滤，利用已有索引避免全表扫描
        const relatedSkillRows = await AgentSkill.findAll({
            where: {
                skill_slug: Array.from(targetSkills),
                agent_id: { [neOp]: target.id },
            },
            attributes: ['agent_id', 'skill_slug'],
        });
        if (relatedSkillRows.length === 0) {
            return [];
        }

        // 统计各候选 Agent 的技能重叠数，使用 Set 防御重复关联
        const overlapSkillMap = new Map();
        relatedSkillRows.forEach((item) => {
            if (!overlapSkillMap.has(item.agent_id)) {
                overlapSkillMap.set(item.agent_id, new Set());
            }
            overlapSkillMap.get(item.agent_id).add(item.skill_slug);
        });

        const candidateIds = Array.from(overlapSkillMap.keys());
        const agentRows = await Agent.findAll({
            where: {
                id: candidateIds,
                is_delete: 0,
            },
        });

        return agentRows
            .map((item) => {
                const itemData = item?.toJSON ? item.toJSON() : item;
                const overlapCount = overlapSkillMap.get(item.id)?.size || 0;
                return {
                    ...this.toAgentListItem(itemData),
                    overlapCount,
                };
            })
            .filter((item) => item.overlapCount > 0)
            .sort((left, right) => {
                if (right.overlapCount !== left.overlapCount) {
                    return right.overlapCount - left.overlapCount;
                }
                return (
                    new Date(right.updatedAt || 0).getTime() -
                    new Date(left.updatedAt || 0).getTime()
                );
            })
            .slice(0, safeLimit);
    }

    async getAgentAssetStream(params = {}) {
        await this.ensureStorageReady();
        const name = String(params.name || '').trim();
        const requestedPath = this.normalizeAgentPath(params.path);
        const { Agent } = this.app.model;
        const row = await Agent.findOne({
            where: {
                name,
                is_delete: 0,
            },
        });
        if (!row) {
            this.ctx.throw(404, 'Agent 不存在');
        }

        const allowedPaths = new Map();
        if (row.logo_path) {
            allowedPaths.set(row.logo_path, row.logo_mime_type || 'application/octet-stream');
        }

        const mimeType = allowedPaths.get(requestedPath);
        if (!mimeType) {
            this.ctx.throw(404, '资源不存在');
        }

        const storageDir = this.getAgentMarketConfig().storageDir;
        const absolutePath = path.join(storageDir, requestedPath);
        const resolvedStorageDir = path.resolve(storageDir);
        const resolvedFilePath = path.resolve(absolutePath);
        if (
            resolvedFilePath !== resolvedStorageDir &&
            !resolvedFilePath.startsWith(`${resolvedStorageDir}${path.sep}`)
        ) {
            this.ctx.throw(400, '资源路径非法');
        }

        if (!fs.existsSync(resolvedFilePath)) {
            this.ctx.throw(404, '资源不存在');
        }

        return {
            stream: fs.createReadStream(resolvedFilePath),
            mimeType,
            cacheControl: requestedPath.includes(`/${row.content_hash}/`)
                ? 'public, max-age=31536000, immutable'
                : 'public, max-age=300',
        };
    }

    async getAgentArchiveStream(name) {
        await this.ensureStorageReady();
        const agentName = this.validateAgentName(name);
        const { Agent } = this.app.model;
        const row = await Agent.findOne({
            where: {
                name: agentName,
                is_delete: 0,
            },
        });
        if (!row) {
            this.ctx.throw(404, 'Agent 不存在');
        }

        const fileName = `${row.name}.zip`;
        const archivePath = path.join(
            this.getAgentMarketConfig().storageDir,
            row.name,
            row.content_hash,
            fileName
        );
        if (!fs.existsSync(archivePath)) {
            this.ctx.throw(404, 'Agent 原始 ZIP 不存在，请重新导入后再试');
        }

        return {
            stream: fs.createReadStream(archivePath),
            fileName,
            mimeType: 'application/zip',
        };
    }

    async deleteAgent(params = {}) {
        await this.ensureStorageReady();
        const name = String(params.name || '').trim();
        if (!name) {
            this.ctx.throw(400, 'Agent 名称不能为空');
        }

        const { Agent, AgentSkill } = this.app.model;
        const row = await Agent.findOne({
            where: {
                name,
                is_delete: 0,
            },
        });
        if (!row) {
            this.ctx.throw(404, 'Agent 不存在');
        }

        await this.app.model.transaction(async (transaction) => {
            await Agent.update(
                { is_delete: 1 },
                {
                    where: { id: row.id },
                    transaction,
                }
            );
            await AgentSkill.destroy({
                where: { agent_id: row.id },
                transaction,
            });
        });

        try {
            const storageDir = this.getAgentMarketConfig().storageDir;
            this.removeDirectory(path.join(storageDir, `${row.name}/${row.content_hash}`));
            this.removeDirectory(path.join(storageDir, 'git_repos', row.name));
        } catch (error) {
            this.ctx.logger.warn(`[agents] 清理资源目录失败: ${error.message}`);
        }

        return {
            name: row.name,
            deleted: true,
        };
    }
    // 解析 GitLab 访问 Token，优先从 env.json、配置及环境变量读取
    resolveGitlabToken() {
        let envConfig = {};
        try {
            const envPath = path.resolve(__dirname, '../../env.json');
            if (fs.existsSync(envPath)) {
                // 清理 require 缓存，确保用户修改 env.json 后无需重启服务即可生效
                delete require.cache[require.resolve(envPath)];
                envConfig = require(envPath);
            }
        } catch (error) {
            envConfig = {};
        }
        const agentConfig = this.getAgentMarketConfig?.() || {};
        const token =
            envConfig.gitlabToken ||
            envConfig.GITLAB_TOKEN ||
            agentConfig.gitlabToken ||
            this.app.config.skills?.gitlabToken ||
            process.env.GITLAB_TOKEN ||
            '';
        return String(token).trim();
    }

    // 解析 GitLab 域名白名单
    resolveGitlabHostWhitelist() {
        const agentConfig = this.getAgentMarketConfig?.() || {};
        const list = agentConfig.gitlabHostWhitelist || this.app.config.skills?.gitlabHostWhitelist;
        if (!Array.isArray(list)) return ['gitlab.prod.dtstack.cn'];
        return list
            .map((item) =>
                String(item || '')
                    .trim()
                    .toLowerCase()
            )
            .filter(Boolean);
    }

    // 从远端 URL 中提取主机名
    extractHostFromRemote(remoteUrl = '') {
        const raw = String(remoteUrl || '').trim();
        if (!raw) return '';
        const httpMatch = raw.match(/^https?:\/\/([^/@:]+)(?::\d+)?(?:\/|$)/i);
        if (httpMatch) return httpMatch[1].toLowerCase();
        const sshMatch = raw.match(/^git@([^:]+):/i);
        if (sshMatch) return sshMatch[1].toLowerCase();
        return '';
    }

    // 获取 Git 命令执行认证前缀参数
    getGitAuthArgs(remoteUrl = '') {
        const host = this.extractHostFromRemote(remoteUrl);
        if (!host) {
            return [];
        }
        const whitelist = this.resolveGitlabHostWhitelist();
        // 校验域名白名单
        if (whitelist.length > 0 && !whitelist.includes(host)) {
            return [];
        }
        const token = this.resolveGitlabToken();
        if (!token) {
            return [];
        }
        const basicToken = Buffer.from(`oauth2:${token}`).toString('base64');
        return ['-c', `http.extraHeader=Authorization: Basic ${basicToken}`];
    }

    // 脱敏错误信息中的 Authorization Header 与 Token，防止敏感凭据外泄
    sanitizeErrorMessage(raw = '') {
        if (!raw) return '';
        return String(raw)
            .replace(
                /Authorization:\s*Basic\s+[a-zA-Z0-9+/=]+/gi,
                'Authorization: Basic [REDACTED]'
            )
            .replace(/oauth2:[^@\s"']+/gi, 'oauth2:[REDACTED]')
            .replace(/(https?:\/\/)([^:@\s]+):([^@\s]+)@/gi, '$1$2:[REDACTED]@');
    }

    // 异步执行 Git 命令，包含超时保护与敏感凭证脱敏
    async runGitCommand(args = [], options = {}) {
        const { cwd, env, timeout = DEFAULT_GIT_TIMEOUT_MS } = options;
        // 彻底清空交互提示与凭据弹窗环境变量，防止在 VSCode/Electron 等环境下唤起外部 askpass 脚本导致挂起
        const safeEnv = {
            ...process.env,
            ...env,
            GIT_TERMINAL_PROMPT: '0',
            GIT_ASKPASS: '',
            SSH_ASKPASS: '',
        };
        // 强制禁用交互式提示与系统凭证助手，并开启安全重定向跟踪
        const defaultArgs = [
            '-c',
            'core.askPass=',
            '-c',
            'credential.helper=',
            '-c',
            'http.followRedirects=true',
        ];
        try {
            return await execFileAsync('git', [...defaultArgs, ...args], {
                cwd,
                env: safeEnv,
                timeout,
                maxBuffer: 10 * 1024 * 1024,
            });
        } catch (error) {
            // 对错误信息与 stderr 进行敏感信息脱敏
            const sanitizedMessage = this.sanitizeErrorMessage(error.message);
            const sanitizedStderr = this.sanitizeErrorMessage(error.stderr?.toString() || '');
            const sanitizedStdout = this.sanitizeErrorMessage(error.stdout?.toString() || '');
            const cleanError = new Error(sanitizedMessage);
            cleanError.stderr = sanitizedStderr;
            cleanError.stdout = sanitizedStdout;
            cleanError.code = error.code;
            throw cleanError;
        }
    }

    // 格式化 Git 错误信息，去除冗余的进度和重定向日志，返回简洁明确且已脱敏的错误提示
    formatGitCloneError(err, targetBranch = 'master') {
        const rawStderr = err?.stderr ? err.stderr.toString() : '';
        const rawMsg = this.sanitizeErrorMessage(rawStderr || err?.message || String(err || ''));

        // 远端分支不存在
        if (
            rawMsg.includes('远程分支') ||
            rawMsg.includes('Remote branch') ||
            rawMsg.includes('not found in upstream origin') ||
            rawMsg.includes('did not match any file(s) known to git')
        ) {
            return `未在远端仓库找到分支「${targetBranch}」，请在设置中检查分支名称（如 master 或 main）`;
        }

        // Git 认证与权限问题
        if (
            rawMsg.includes('could not read Username') ||
            rawMsg.includes('Authentication failed') ||
            rawMsg.includes('Permission denied') ||
            rawMsg.includes('terminal prompts disabled') ||
            rawMsg.includes('Access denied') ||
            rawMsg.includes('鉴权失败')
        ) {
            return 'Git 认证失败，请检查 env.json 或环境变量中是否配置了有效的 gitlabToken';
        }

        // 远端仓库不存在或无权限
        if (
            rawMsg.includes('The project you were looking for could not be found') ||
            (rawMsg.includes('repository') && rawMsg.includes('not found')) ||
            rawMsg.includes('仓库未找到')
        ) {
            return '未找到远程仓库，请检查仓库地址是否正确或是否有权限访问';
        }

        // 网络与连接问题
        if (
            rawMsg.includes('Could not resolve host') ||
            rawMsg.includes('Failed to connect') ||
            rawMsg.includes('Connection timed out') ||
            rawMsg.includes('Network is unreachable') ||
            rawMsg.includes('unable to access')
        ) {
            return '连接远程仓库失败，请检查网络连接或仓库地址';
        }

        // 未知错误时提取核心报错行，过滤掉进度和重定向日志
        const lines = rawMsg
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => {
                if (!line) return false;
                if (/^(正克隆到|Cloning into)/i.test(line)) return false;
                if (/^(警告：重定向到|warning:\s*redirecting)/i.test(line)) return false;
                return true;
            });

        // 优先提取包含 fatal 或 error 的关键错误行
        const fatalLine = lines.find((line) => /(?:fatal|error|致命错误|错误)[：:]/i.test(line));
        if (fatalLine) {
            return fatalLine.replace(/^(?:fatal|error|致命错误|错误)[：:]\s*/i, '').trim();
        }

        // 无显式 fatal 标识时取最后一行有效输出
        if (lines.length > 0) {
            return lines[lines.length - 1];
        }

        return '未知错误，请检查 Git 配置或查看服务端日志';
    }

    // 解析与规范化 Git 仓库地址，兼容从 GitLab 网页端复制的 tree/blob 路径，并解析仓库名与分支
    normalizeGitSource(rawUrl = '', rawBranch = 'master') {
        const trimmed = String(rawUrl || '').trim();
        if (!trimmed) {
            this.ctx.throw(400, '缺少 Git 仓库地址');
        }

        let cleanUrl = trimmed.replace(/#.*$/, '').replace(/\?.*$/, '').replace(/\/+$/, '');
        let targetBranch = String(rawBranch || 'master').trim() || 'master';

        // 兼容 GitLab 网页端复制的 URL，如 http://gitlab.xxx.cn/group/project/-/tree/branch_name，支持带斜杠的多级分支名
        const treeMatch = cleanUrl.match(/^(https?:\/\/[^/]+\/.+?)(?:\/-)?\/(?:tree|blob)\/(.+)$/i);
        if (treeMatch) {
            cleanUrl = treeMatch[1].replace(/\/+$/, '');
            // 若用户未显式指定非 master 分支，优先采用 URL 中解析出的分支（去除首尾斜杠）
            if (treeMatch[2] && (!rawBranch || rawBranch === 'master')) {
                targetBranch = treeMatch[2].replace(/^\/+|\/+$/g, '');
            }
        }

        // 提取仓库名（移除 .git 后缀）
        const repoName =
            cleanUrl
                .split('/')
                .pop()
                .replace(/\.git$/i, '') || '';

        // 严格前置校验仓库名格式，防止路径遍历或非法目录访问
        if (!repoName || !AGENT_NAME_PATTERN.test(repoName)) {
            this.ctx.throw(
                400,
                `非法的 Git 仓库名称「${repoName || cleanUrl}」，必须符合 kebab-case 规范`
            );
        }

        // 自动规范化 HTTP/HTTPS 协议仓库地址，确保以 .git 结尾，避免 GitLab 301 重定向导致丢弃 Authorization 请求头
        if (/^https?:\/\//i.test(cleanUrl) && !cleanUrl.endsWith('.git')) {
            cleanUrl = `${cleanUrl}.git`;
        }

        // 校验分支名格式合法性，防止非法参数注入
        if (!GIT_BRANCH_PATTERN.test(targetBranch)) {
            this.ctx.throw(400, `非法的分支名称: ${targetBranch}`);
        }

        return {
            cleanGitUrl: cleanUrl,
            targetBranch,
            repoName,
        };
    }

    // 从 Git 仓库导入或更新 Agent
    async importAgentFromGit(gitUrl, gitBranch = 'master', category = null) {
        await this.ensureStorageReady();

        const { cleanGitUrl, targetBranch, repoName } = this.normalizeGitSource(gitUrl, gitBranch);

        // 并发同步锁：若当前仓库正在同步中，阻止并发执行以避免 index.lock 冲突
        if (activeSyncRepos.has(repoName)) {
            this.ctx.throw(409, `Agent「${repoName}」正在同步中，请稍后再试`);
        }
        activeSyncRepos.add(repoName);

        try {
            const storageDir = this.getAgentMarketConfig().storageDir;
            const reposDir = path.join(storageDir, 'git_repos');
            const targetDir = path.join(reposDir, repoName);

            fs.mkdirSync(reposDir, { recursive: true });

            // 配置 Git 执行环境变量与认证参数，避免服务器因缺少终端或无权限时挂起
            const gitEnv = {
                GIT_TERMINAL_PROMPT: '0',
                GIT_ASKPASS: '',
                SSH_ASKPASS: '',
                GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=no',
            };
            const authArgs = this.getGitAuthArgs(cleanGitUrl);

            // 1. 同步远端代码
            if (fs.existsSync(targetDir)) {
                this.ctx.logger.info(
                    `[agents] Fetching ${cleanGitUrl}#${targetBranch} in ${targetDir}`
                );
                try {
                    // 确保 remote url 与当前传入的 cleanGitUrl 保持一致，防止用户修改仓库地址后拉取旧地址
                    try {
                        await this.runGitCommand(['remote', 'set-url', 'origin', cleanGitUrl], {
                            cwd: targetDir,
                            env: gitEnv,
                        });
                    } catch (remoteErr) {
                        this.ctx.logger.warn(`[agents] 更新 remote url 失败: ${remoteErr.message}`);
                    }

                    // 显式拉取指定分支并保持 depth 1，兼容同分支更新与跨分支切换
                    await this.runGitCommand(
                        [...authArgs, 'fetch', '--depth', '1', 'origin', '--', targetBranch],
                        {
                            cwd: targetDir,
                            env: gitEnv,
                        }
                    );
                    await this.runGitCommand(['reset', '--hard', 'FETCH_HEAD'], {
                        cwd: targetDir,
                        env: gitEnv,
                    });
                    // 清理工作区未跟踪文件，防止脏文件污染 skills 扫描
                    await this.runGitCommand(['clean', '-fd'], {
                        cwd: targetDir,
                        env: gitEnv,
                    });
                } catch (err) {
                    this.ctx.logger.warn(
                        `[agents] Git fetch 失败，尝试重新克隆: ${this.sanitizeErrorMessage(
                            err.message
                        )}`
                    );
                    fs.rmSync(targetDir, { recursive: true, force: true });
                    try {
                        await this.runGitCommand(
                            [
                                ...authArgs,
                                'clone',
                                '--depth',
                                '1',
                                '--branch',
                                targetBranch,
                                '--',
                                cleanGitUrl,
                                repoName,
                            ],
                            { cwd: reposDir, env: gitEnv }
                        );
                    } catch (cloneErr) {
                        const errMsg = this.formatGitCloneError(cloneErr, targetBranch);
                        this.ctx.throw(400, `Git Clone 失败: ${errMsg}`);
                    }
                }
            } else {
                this.ctx.logger.info(
                    `[agents] Cloning ${cleanGitUrl}#${targetBranch} to ${targetDir}`
                );
                try {
                    await this.runGitCommand(
                        [
                            ...authArgs,
                            'clone',
                            '--depth',
                            '1',
                            '--branch',
                            targetBranch,
                            '--',
                            cleanGitUrl,
                            repoName,
                        ],
                        { cwd: reposDir, env: gitEnv }
                    );
                } catch (err) {
                    const errMsg = this.formatGitCloneError(err, targetBranch);
                    this.ctx.throw(400, `Git Clone 失败: ${errMsg}`);
                }
            }

            // 2. 解析 Manifests
            const codexManifestPath = path.join(targetDir, '.codex-plugin/plugin.json');
            const claudeManifestPath = path.join(targetDir, '.claude-plugin/plugin.json');

            if (!fs.existsSync(codexManifestPath)) {
                this.ctx.throw(400, '仓库根目录缺少 .codex-plugin/plugin.json');
            }
            if (!fs.existsSync(claudeManifestPath)) {
                this.ctx.throw(400, '仓库根目录缺少 .claude-plugin/plugin.json');
            }

            const manifest = this.parseCodexPluginJson(fs.readFileSync(codexManifestPath, 'utf8'));
            const claudeManifest = this.parseClaudePluginJson(
                fs.readFileSync(claudeManifestPath, 'utf8')
            );

            const validated = this.validateCodexManifest(manifest);
            const validatedClaude = this.validateClaudeManifest(claudeManifest);

            if (validated.name !== repoName || validatedClaude.name !== repoName) {
                this.ctx.throw(
                    400,
                    `Manifest name (${validated.name}) 必须与 Git 仓库名 (${repoName}) 保持一致`
                );
            }
            // 双向校验版本：两者核心版本必须完全一致
            const vCodex = String(validated.version || '')
                .split('+')[0]
                .trim();
            const vClaude = String(validatedClaude.version || '')
                .split('+')[0]
                .trim();
            if (vCodex !== vClaude) {
                this.ctx.throw(400, '两个 plugin manifest 的 version 必须一致');
            }

            // 3. 计算最新提交 Hash
            let contentHash;
            try {
                const { stdout } = await this.runGitCommand(['rev-parse', 'HEAD'], {
                    cwd: targetDir,
                });
                contentHash = stdout.trim();
            } catch (e) {
                this.ctx.throw(500, `解析 Git HEAD 提交哈希失败: ${e.message}`);
            }

            // 4. 解析 Logo 资源
            let logo = null;
            const LOGO_ALLOWED = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp'];
            const logoPaths = validated.logoRef
                ? [validated.logoRef]
                : [
                      ...LOGO_ALLOWED.map((name) => `assets/${name}`),
                      ...LOGO_ALLOWED.map((name) => `.codex-plugin/assets/${name}`),
                  ];

            for (const relativeLogoPath of logoPaths) {
                const absoluteLogoPath = path.join(targetDir, relativeLogoPath);
                if (fs.existsSync(absoluteLogoPath)) {
                    const logoBuffer = fs.readFileSync(absoluteLogoPath);
                    const logoName = path.basename(relativeLogoPath);
                    const mimeType = mime.lookup(logoName) || 'application/octet-stream';
                    logo = {
                        path: `${validated.name}/${contentHash}/${relativeLogoPath}`,
                        mimeType,
                        size: logoBuffer.length,
                        hash: crypto.createHash('sha256').update(logoBuffer).digest('hex'),
                        buffer: logoBuffer,
                    };
                    break;
                } else if (validated.logoRef) {
                    this.ctx.throw(400, `Logo 文件不存在: ./${relativeLogoPath}`);
                }
            }

            // 5. 数据库持久化
            const { Agent, AgentSkill } = this.app.model;
            const existing = await Agent.findOne({ where: { name: validated.name } });

            let agentId = existing ? existing.id : null;

            // 计算分类：优先使用导入指定的分类，其次保留已有分类或使用 manifest 解析的分类，兜底为工程效率
            const targetCategory =
                category && isValidSkillCategory(category)
                    ? category
                    : existing?.category || validated.category || '工程效率';

            const now = new Date();
            const isContentChanged = !existing || existing.content_hash !== contentHash;

            const agentPayload = {
                name: validated.name,
                display_name: validated.displayName,
                version: validated.version,
                description: validated.description,
                profile: validated.longDescription,
                author_name: validated.authorName,
                category: targetCategory,
                tags: JSON.stringify(validated.keywords || []),
                prompts: JSON.stringify(
                    (validated.defaultPrompt || []).map((prompt, index) => ({
                        title: `开场问题 ${index + 1}`,
                        prompt,
                    }))
                ),
                capabilities: JSON.stringify(validated.capabilities || []),
                logo_path: logo ? logo.path : '',
                logo_mime_type: logo ? logo.mimeType : '',
                logo_size: logo ? logo.size : 0,
                logo_hash: logo ? logo.hash : '',
                content_hash: contentHash,
                is_delete: 0,
                git_url: cleanGitUrl,
                git_branch: targetBranch,
                last_git_refresh_at: now,
                last_git_sync_at: isContentChanged
                    ? now
                    : existing?.last_git_sync_at || existing?.updated_at || now,
            };

            // 5. 静态资源与 ZIP 归档缓存（前置打包，确保归档就绪后再落库，保障原子性）
            if (logo) {
                const absolutePath = path.join(storageDir, logo.path);
                fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
                fs.writeFileSync(absolutePath, logo.buffer);
            }

            const archiveDir = path.join(storageDir, validated.name, contentHash);
            fs.mkdirSync(archiveDir, { recursive: true });
            const archivePath = path.join(archiveDir, `${validated.name}.zip`);

            // 异步执行 git archive 原生打包
            await this.runGitCommand(
                [
                    'archive',
                    '--format=zip',
                    `--prefix=${validated.name}/`,
                    'HEAD',
                    '-o',
                    archivePath,
                ],
                { cwd: targetDir }
            );

            // 6. 数据库持久化（归档已就绪，安全提交事务）
            await this.app.model.transaction(async (transaction) => {
                if (!existing) {
                    const created = await Agent.create(agentPayload, { transaction });
                    agentId = created.id;
                } else {
                    await Agent.update(agentPayload, { where: { id: existing.id }, transaction });
                }

                // 提取 skills 目录下的 SKILL.md
                const agentSkills = [];
                const skillsDir = path.join(targetDir, validated.skills || 'skills');
                if (fs.existsSync(skillsDir)) {
                    const items = fs.readdirSync(skillsDir);
                    for (const item of items) {
                        const skillItemDir = path.join(skillsDir, item);
                        if (!fs.statSync(skillItemDir).isDirectory()) continue;
                        // 兼容大小写 SKILL.md 与 skill.md
                        const skillFiles = fs.readdirSync(skillItemDir);
                        const skillMdFile = skillFiles.find((f) => f.toLowerCase() === 'skill.md');
                        if (skillMdFile) {
                            const skillMdPath = path.join(skillItemDir, skillMdFile);
                            let skillName = extractSkillMdName(
                                fs.readFileSync(skillMdPath, 'utf8')
                            ).trim();
                            if (!skillName) skillName = item;
                            if (skillName && !agentSkills.includes(skillName)) {
                                agentSkills.push(skillName);
                            }
                        }
                    }
                }

                await AgentSkill.destroy({ where: { agent_id: agentId }, transaction });
                if (agentSkills.length > 0) {
                    await AgentSkill.bulkCreate(
                        agentSkills.map((skillSlug) => ({
                            agent_id: agentId,
                            skill_slug: skillSlug,
                        })),
                        { transaction }
                    );
                }
            });

            // 清理旧版本的归档目录
            if (existing && existing.content_hash && existing.content_hash !== contentHash) {
                this.removeDirectory(path.join(storageDir, validated.name, existing.content_hash));
            }

            return {
                id: agentId,
                name: validated.name,
                version: validated.version,
                updated: !!existing,
                contentHash,
                isContentChanged,
            };
        } finally {
            activeSyncRepos.delete(repoName);
        }
    }

    // 单独同步指定名称的 Agent
    async syncGitAgentByName(name) {
        if (!name) {
            this.ctx.throw(400, '缺少 Agent 名称');
        }
        const agent = await this.app.model.Agent.findOne({
            where: {
                name,
                is_delete: 0,
            },
        });
        if (!agent) {
            this.ctx.throw(404, `未找到 Agent: ${name}`);
        }
        if (!agent.git_url) {
            this.ctx.throw(400, `Agent ${name} 未配置 Git 仓库地址`);
        }
        this.ctx.logger.info(`[agents] 单独同步 Agent ${agent.name} 来自 ${agent.git_url}`);
        const result = await this.importAgentFromGit(
            agent.git_url,
            agent.git_branch || 'master',
            agent.category
        );
        return {
            name: agent.name,
            success: true,
            version: result.version,
            contentHash: result.contentHash,
            isContentChanged: result.isContentChanged,
        };
    }

    // 全量同步所有配置了 Git 仓库的 Agent
    async syncAllGitAgents() {
        const agents = await this.app.model.Agent.findAll({
            where: {
                is_delete: 0,
                git_url: { [this.app.Sequelize.Op.ne]: null },
            },
        });

        // 过滤掉空字符串地址
        const validAgents = agents.filter((agent) => agent.git_url && String(agent.git_url).trim());

        const results = [];
        for (const agent of validAgents) {
            try {
                this.ctx.logger.info(`[agents] 正在同步 Agent ${agent.name} 来自 ${agent.git_url}`);
                const result = await this.importAgentFromGit(
                    agent.git_url,
                    agent.git_branch,
                    agent.category
                );
                results.push({
                    name: agent.name,
                    success: true,
                    version: result.version,
                    contentHash: result.contentHash,
                    isContentChanged: result.isContentChanged,
                });
            } catch (error) {
                this.ctx.logger.error(`[agents] 同步 Agent ${agent.name} 失败: ${error.message}`);
                results.push({ name: agent.name, success: false, error: error.message });
            }
        }
        return results;
    }

    // 更新 Agent 的 Git 仓库配置，支持可选立即同步
    async updateAgentGitConfig(params = {}) {
        const { name, gitUrl, gitBranch, category, syncNow } = params;
        if (!name) {
            this.ctx.throw(400, '缺少 Agent 名称');
        }
        const agent = await this.app.model.Agent.findOne({
            where: {
                name,
                is_delete: 0,
            },
        });
        if (!agent) {
            this.ctx.throw(404, `未找到 Agent: ${name}`);
        }
        const updates = {};
        if (gitUrl !== undefined) {
            const rawUrl = String(gitUrl || '').trim();
            if (rawUrl) {
                const { cleanGitUrl: normalizedUrl, targetBranch: normalizedBranch } =
                    this.normalizeGitSource(rawUrl, gitBranch || agent.git_branch);
                updates.git_url = normalizedUrl;
                if (gitBranch === undefined) {
                    updates.git_branch = normalizedBranch;
                }
            } else {
                updates.git_url = '';
            }
        }
        if (gitBranch !== undefined) {
            const targetBranch = String(gitBranch || 'master').trim();
            if (!GIT_BRANCH_PATTERN.test(targetBranch)) {
                this.ctx.throw(400, `非法的分支名称: ${targetBranch}`);
            }
            updates.git_branch = targetBranch;
        }
        if (category && isValidSkillCategory(category)) {
            updates.category = category;
        }
        await agent.update(updates);

        if (syncNow) {
            if (!agent.git_url) {
                this.ctx.throw(400, '请先填写 GitLab 仓库地址');
            }
            this.ctx.logger.info(
                `[agents] 更新配置并立即同步 Agent ${agent.name} 来自 ${agent.git_url}#${agent.git_branch}`
            );
            const syncResult = await this.importAgentFromGit(
                agent.git_url,
                agent.git_branch || 'master',
                agent.category
            );
            return {
                name: agent.name,
                gitUrl: agent.git_url,
                gitBranch: agent.git_branch,
                category: agent.category,
                synced: true,
                version: syncResult.version,
                contentHash: syncResult.contentHash,
                isContentChanged: syncResult.isContentChanged,
            };
        }

        return {
            name: agent.name,
            gitUrl: agent.git_url,
            gitBranch: agent.git_branch,
            category: agent.category,
            synced: false,
        };
    }

    async getInstallScript() {
        const filePath = path.join(this.app.baseDir, 'app/public/install.sh');
        let content = await fs.promises.readFile(filePath, 'utf-8');
        const host =
            (this.ctx.get && this.ctx.get('x-forwarded-host')) || this.ctx.host || 'localhost:7001';
        const protocol =
            (this.ctx.get && this.ctx.get('x-forwarded-proto')) || this.ctx.protocol || 'http';
        const currentBaseUrl = `${protocol}://${host}/agent-market`;
        content = content.replace(/__AGENT_MARKET_BASE_URL__/g, currentBaseUrl);
        return content;
    }

    async getCreatePluginScript() {
        const filePath = path.join(this.app.baseDir, 'app/public/create-plugin.sh');
        return await fs.promises.readFile(filePath, 'utf-8');
    }
}

module.exports = AgentsService;
