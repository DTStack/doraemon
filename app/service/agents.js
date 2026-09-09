const Service = require('egg').Service;
const AdmZip = require('adm-zip');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const { normalizeRelativePath, extractSkillMdName } = require('../utils/skill-utils');
const { resolveSkillIdentifier, sanitizeInstallKeySegment } = require('../utils/skill-install-key');
const {
    isValidSkillCategory,
    SKILL_CATEGORY_OPTIONS,
} = require('../../contracts/skill-categories');

const AGENT_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

class AgentsService extends Service {
    constructor(ctx) {
        super(ctx);
        this.storageReady = false;
        this.storageReadyPromise = null;
    }

    getAgentMarketConfig() {
        return {
            storageDir: '/data/doraemon/agent-market',
            maxZipSize: 50 * 1024 * 1024,
            maxExtractedSize: 200 * 1024 * 1024,
            maxFileCount: 500,
            maxSingleFileSize: 20 * 1024 * 1024,
            maxImageSize: 5 * 1024 * 1024,
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
            const { Agent, AgentFile, AgentSkill } = this.app.model;
            if (!Agent || !AgentFile || !AgentSkill) {
                this.ctx.throw(500, 'Agent 数据模型未加载');
            }

            await Agent.sync();
            await AgentFile.sync();
            await AgentSkill.sync();
            await this.ensureAgentSkillsTableCompatible();
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

    isLikelyBinary(buffer) {
        if (!buffer || buffer.length === 0) return false;
        const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
        if (sample.includes(0)) return true;
        try {
            new TextDecoder('utf-8', { fatal: true }).decode(buffer);
            return false;
        } catch {
            return true;
        }
    }

    getZipEntryMode(entry) {
        const attr = Number(entry?.attr || entry?.header?.attr || 0);
        const mode = (attr >>> 16) & 0xffff;
        return mode || 0o644;
    }

    isSymbolicLink(entry) {
        const mode = this.getZipEntryMode(entry);
        return (mode & 0o170000) === 0o120000;
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

    parseSemver(version) {
        const match = String(version || '')
            .trim()
            .match(SEMVER_PATTERN);
        if (!match) {
            this.ctx.throw(400, 'metadata.version 必须是有效的 SemVer 格式');
        }

        return {
            major: Number(match[1]),
            minor: Number(match[2]),
            patch: Number(match[3]),
            prerelease: match[4] || '',
        };
    }

    compareAgentVersion(left, right) {
        const a = this.parseSemver(left);
        const b = this.parseSemver(right);
        const keys = ['major', 'minor', 'patch'];
        for (const key of keys) {
            if (a[key] > b[key]) return 1;
            if (a[key] < b[key]) return -1;
        }

        if (!a.prerelease && !b.prerelease) return 0;
        if (!a.prerelease) return 1;
        if (!b.prerelease) return -1;
        return a.prerelease.localeCompare(b.prerelease);
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
        if (defaultPrompt.length > 3) {
            this.ctx.throw(400, 'interface.defaultPrompt 最多支持 3 条');
        }
        if (defaultPrompt.some((item) => typeof item !== 'string' || item.length > 128)) {
            this.ctx.throw(400, 'interface.defaultPrompt 每条必须是 128 字符以内的字符串');
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

    buildContentHash(records) {
        const hash = crypto.createHash('sha256');
        records
            .slice()
            .sort((left, right) => left.filePath.localeCompare(right.filePath))
            .forEach((item) => {
                hash.update(item.filePath);
                hash.update('\0');
                hash.update(item.buffer);
                hash.update('\0');
            });
        return hash.digest('hex');
    }

    async parseAgentZip(zipPath) {
        const config = this.getAgentMarketConfig();
        let zip;

        try {
            zip = new AdmZip(zipPath);
        } catch (error) {
            this.ctx.throw(400, `解析 .zip 文件失败: ${error.message}`);
        }

        const entries = zip.getEntries().filter((entry) => {
            const normalizedName = String(entry.entryName || '').replace(/\\/g, '/');
            if (!normalizedName) return false;
            if (normalizedName.startsWith('__MACOSX/')) return false;
            if (normalizedName.endsWith('.DS_Store')) return false;
            return true;
        });

        const fileEntries = entries.filter((entry) => !entry.isDirectory);
        if (fileEntries.length === 0) {
            this.ctx.throw(400, '.zip 包内未发现有效文件');
        }
        if (fileEntries.length > config.maxFileCount) {
            this.ctx.throw(400, `文件数量超过限制: ${config.maxFileCount}`);
        }

        const caseInsensitivePaths = new Set();
        const topLevelDirs = new Set();
        const fileRecords = [];
        const fileMap = new Map();
        let extractedSize = 0;

        // 逐个 ZIP 条目校验路径、大小和特殊文件
        fileEntries.forEach((entry) => {
            if (this.isSymbolicLink(entry)) {
                this.ctx.throw(400, `不支持软链接: ${entry.entryName}`);
            }

            const normalized = this.normalizeAgentPath(entry.entryName);
            const lowerCasePath = normalized.toLowerCase();
            if (caseInsensitivePaths.has(lowerCasePath)) {
                this.ctx.throw(400, `检测到重复路径: ${normalized}`);
            }
            caseInsensitivePaths.add(lowerCasePath);

            const buffer = entry.getData();
            if (buffer.length > config.maxSingleFileSize) {
                this.ctx.throw(400, `文件超过大小限制: ${normalized}`);
            }

            extractedSize += buffer.length;
            if (extractedSize > config.maxExtractedSize) {
                this.ctx.throw(400, `解压后总大小超过限制: ${config.maxExtractedSize}`);
            }

            const [topLevel] = normalized.split('/');
            if (topLevel) {
                topLevelDirs.add(topLevel);
            }

            fileRecords.push({
                entry,
                filePath: normalized,
                buffer,
                size: buffer.length,
            });
            fileMap.set(normalized, {
                entry,
                buffer,
                size: buffer.length,
            });
        });

        if (topLevelDirs.size !== 1) {
            this.ctx.throw(400, 'ZIP 顶层必须且只能包含一个 Agent 目录');
        }

        const [rootDir] = [...topLevelDirs];
        const pluginJsonPath = `${rootDir}/.codex-plugin/plugin.json`;
        const pluginJsonEntry = fileMap.get(pluginJsonPath);
        if (!pluginJsonEntry) {
            this.ctx.throw(400, 'ZIP 中缺少根目录 .codex-plugin/plugin.json');
        }
        const claudePluginJsonPath = `${rootDir}/.claude-plugin/plugin.json`;
        const claudePluginJsonEntry = fileMap.get(claudePluginJsonPath);
        if (!claudePluginJsonEntry) {
            this.ctx.throw(400, 'ZIP 中缺少根目录 .claude-plugin/plugin.json');
        }

        const relativeFileMap = new Map();
        fileRecords.forEach((item) => {
            const relativePath = item.filePath.slice(rootDir.length + 1);
            if (!relativePath) return;
            relativeFileMap.set(relativePath, {
                ...item,
                relativePath,
            });
        });

        const manifest = this.parseCodexPluginJson(pluginJsonEntry.buffer.toString('utf8'));
        const claudeManifest = this.parseClaudePluginJson(
            claudePluginJsonEntry.buffer.toString('utf8')
        );
        const validated = this.validateCodexManifest(manifest);
        const validatedClaude = this.validateClaudeManifest(claudeManifest);
        if (validated.name !== rootDir || validatedClaude.name !== validated.name) {
            this.ctx.throw(400, '两个 plugin manifest 的 name 必须与 Agent 目录名一致');
        }
        if (validatedClaude.version && validatedClaude.version !== validated.version) {
            this.ctx.throw(400, '两个 plugin manifest 的 version 必须一致');
        }
        if (
            ![...relativeFileMap.keys()].some(
                (filePath) =>
                    filePath === validated.skills || filePath.startsWith(`${validated.skills}/`)
            )
        ) {
            this.ctx.throw(400, `Codex skills 路径不存在: ./${validated.skills}`);
        }
        validatedClaude.agents.forEach((agentPath) => {
            if (!relativeFileMap.has(agentPath)) {
                this.ctx.throw(400, `Claude agent 文件不存在: ./${agentPath}`);
            }
        });
        const contentHash = this.buildContentHash(
            fileRecords.map((item) => ({
                filePath: item.filePath,
                buffer: item.buffer,
            }))
        );

        // logo 从包内 assets/logo.png 读取（支持 png/jpeg/webp），随 resource 落盘并记录元数据
        const LOGO_ALLOWED = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp'];
        let logo = null;
        const assetFiles = [];
        const logoPaths = validated.logoRef
            ? [validated.logoRef]
            : [
                  ...LOGO_ALLOWED.map((name) => `assets/${name}`),
                  ...LOGO_ALLOWED.map((name) => `.codex-plugin/assets/${name}`),
              ];
        const hasExplicitLogo = Boolean(validated.logoRef);
        for (const relativeLogoPath of logoPaths) {
            const logoName = path.basename(relativeLogoPath);
            // 兼容仓库内 assets 与 Codex 官方示例使用的 .codex-plugin/assets 两种布局
            const isSupportedLogoPath =
                relativeLogoPath.startsWith('assets/') ||
                relativeLogoPath.startsWith('.codex-plugin/assets/');
            if (!LOGO_ALLOWED.includes(logoName) || !isSupportedLogoPath) {
                this.ctx.throw(
                    400,
                    'interface.logo 仅支持 assets/logo.{png,jpg,jpeg,webp} 或 .codex-plugin/assets/logo.{png,jpg,jpeg,webp}'
                );
            }
            const logoEntry = fileMap.get(`${rootDir}/${relativeLogoPath}`);
            if (!logoEntry) {
                if (hasExplicitLogo) {
                    this.ctx.throw(400, `Logo 文件不存在: ./${relativeLogoPath}`);
                }
                continue;
            }
            if (logoEntry.size > config.maxImageSize) {
                this.ctx.throw(400, `Logo 文件超过大小限制: ./${relativeLogoPath}`);
            }
            const mimeType = mime.lookup(logoName) || 'application/octet-stream';
            logo = {
                path: `${validated.name}/${contentHash}/${relativeLogoPath}`,
                mimeType,
                size: logoEntry.size,
                hash: this.buildContentHash([
                    { filePath: relativeLogoPath, buffer: logoEntry.buffer },
                ]),
            };
            assetFiles.push({
                path: logo.path,
                buffer: logoEntry.buffer,
            });
            break;
        }

        const files = [...relativeFileMap.values()]
            .filter(
                (item) =>
                    !item.relativePath.startsWith('assets/') &&
                    !item.relativePath.startsWith('.codex-plugin/assets/')
            )
            .map((item) => {
                const isBinary = this.isLikelyBinary(item.buffer);
                return {
                    filePath: item.relativePath,
                    mimeType: mime.lookup(item.relativePath) || 'application/octet-stream',
                    size: item.size,
                    isBinary,
                    encoding: isBinary ? 'base64' : 'utf8',
                    mode: this.getZipEntryMode(item.entry),
                    content: isBinary
                        ? item.buffer.toString('base64')
                        : item.buffer.toString('utf8'),
                };
            });

        // 解析 Agent 包内 skills 目录下的 SKILL.md，得到关联 Skill 的标识列表
        const agentSkills = [];
        if (validated.skills) {
            const skillsPrefix = `${validated.skills}/`;
            [...relativeFileMap.values()].forEach((item) => {
                if (!item.relativePath.startsWith(skillsPrefix)) return;
                if (path.basename(item.relativePath).toLowerCase() !== 'skill.md') return;

                const content = item.buffer.toString('utf8');
                let name = extractSkillMdName(content).trim();
                if (!name) {
                    const dir = path.posix.dirname(item.relativePath);
                    name = dir.split('/').pop() || '';
                }
                if (!name) return;
                if (!agentSkills.includes(name)) agentSkills.push(name);
            });
        }

        return {
            agent: {
                name: validated.name,
                displayName: validated.displayName,
                version: validated.version,
                description: validated.description,
                longDescription: validated.longDescription,
                authorName: validated.authorName,
                category: validated.category,
                keywords: validated.keywords,
                defaultPrompt: validated.defaultPrompt,
                capabilities: validated.capabilities,
                skills: agentSkills,
                logo,
                contentHash,
                fileCount: fileRecords.length,
            },
            files,
            assetFiles,
        };
    }

    async writeAssetFiles(assetFiles = []) {
        const storageDir = this.getAgentMarketConfig().storageDir;
        const touchedDirs = new Set();

        assetFiles.forEach((item) => {
            const absolutePath = path.join(storageDir, item.path);
            const parentDir = path.dirname(absolutePath);
            fs.mkdirSync(parentDir, { recursive: true });
            fs.writeFileSync(absolutePath, item.buffer);
            touchedDirs.add(path.join(storageDir, item.path.split('/').slice(0, 2).join('/')));
        });

        return touchedDirs;
    }

    async writeAgentArchive(agent, sourcePath) {
        const storageDir = this.getAgentMarketConfig().storageDir;
        const archiveDir = path.join(storageDir, agent.name, agent.contentHash);
        const archivePath = path.join(archiveDir, `${agent.name}.zip`);
        fs.mkdirSync(archiveDir, { recursive: true });
        fs.copyFileSync(sourcePath, archivePath);
        return archiveDir;
    }

    removeDirectory(targetPath) {
        if (!targetPath || !fs.existsSync(targetPath)) return;
        fs.rmSync(targetPath, { recursive: true, force: true });
    }

    async importAgentFile(params = {}, file) {
        if (!file?.filename || !file?.filepath) {
            this.ctx.throw(400, '上传文件无效');
        }
        if (!String(file.filename).toLowerCase().endsWith('.zip')) {
            this.ctx.throw(400, '仅支持上传 .zip 文件');
        }

        const config = this.getAgentMarketConfig();
        if (file.size && file.size > config.maxZipSize) {
            this.ctx.throw(400, `ZIP 文件超过大小限制 ${config.maxZipSize / 1024 / 1024}MB`);
        }

        await this.ensureStorageReady();

        const parsed = await this.parseAgentZip(file.filepath);
        const { Agent, AgentFile } = this.app.model;
        const existing = await Agent.findOne({
            where: {
                name: parsed.agent.name,
            },
        });

        if (existing && Number(existing.is_delete) !== 1) {
            const versionDiff = this.compareAgentVersion(parsed.agent.version, existing.version);
            if (versionDiff < 0) {
                this.ctx.throw(
                    400,
                    `低版本禁止覆盖，当前版本 ${existing.version}，导入版本 ${parsed.agent.version}`
                );
            }

            if (existing.content_hash === parsed.agent.contentHash) {
                await this.writeAgentArchive(parsed.agent, file.filepath);
                return {
                    unchanged: true,
                    name: parsed.agent.name,
                    version: parsed.agent.version,
                    message: '内容未变化',
                };
            }

            const confirmed = String(params.confirmOverwrite || '').trim() === 'true';
            if (!confirmed) {
                return {
                    requiresConfirm: true,
                    name: parsed.agent.name,
                    currentVersion: existing.version,
                    incomingVersion: parsed.agent.version,
                };
            }
        }

        let touchedDirs = new Set();

        try {
            touchedDirs = await this.writeAssetFiles(parsed.assetFiles);
            touchedDirs.add(await this.writeAgentArchive(parsed.agent, file.filepath));
            const result = await this.app.model.transaction(async (transaction) => {
                let agentId = existing ? existing.id : null;

                const agentPayload = {
                    name: parsed.agent.name,
                    display_name: parsed.agent.displayName,
                    version: parsed.agent.version,
                    description: parsed.agent.description,
                    profile: parsed.agent.longDescription,
                    author_name: parsed.agent.authorName,
                    category: parsed.agent.category,
                    tags: JSON.stringify(parsed.agent.keywords || []),
                    prompts: JSON.stringify(
                        (parsed.agent.defaultPrompt || []).map((prompt, index) => ({
                            title: `开场问题 ${index + 1}`,
                            prompt,
                        }))
                    ),
                    capabilities: JSON.stringify(parsed.agent.capabilities || []),
                    logo_path: parsed.agent.logo ? parsed.agent.logo.path : null,
                    logo_mime_type: parsed.agent.logo ? parsed.agent.logo.mimeType : null,
                    logo_size: parsed.agent.logo ? parsed.agent.logo.size : null,
                    logo_hash: parsed.agent.logo ? parsed.agent.logo.hash : null,
                    content_hash: parsed.agent.contentHash,
                    source_file_name: file.filename,
                    file_count: parsed.agent.fileCount,
                    is_delete: 0,
                };

                if (!existing) {
                    const created = await Agent.create(agentPayload, { transaction });
                    agentId = created.id;
                } else {
                    await Agent.update(agentPayload, {
                        where: { id: existing.id },
                        transaction,
                    });
                    agentId = existing.id;
                    await AgentFile.destroy({
                        where: { agent_id: agentId },
                        transaction,
                    });
                }

                const fileRows = parsed.files.map((item) => ({
                    agent_id: agentId,
                    file_path: item.filePath,
                    mime_type: item.mimeType,
                    size: item.size,
                    is_binary: item.isBinary ? 1 : 0,
                    encoding: item.encoding,
                    mode: item.mode,
                    content: item.content,
                    is_delete: 0,
                }));

                if (fileRows.length > 0) {
                    await AgentFile.bulkCreate(fileRows, { transaction });
                }

                // 持久化 Agent 关联的 Skill（先清后写，保证与本次包内容一致）
                const { AgentSkill } = this.app.model;
                const skillSlugs = Array.isArray(parsed.agent.skills) ? parsed.agent.skills : [];
                await AgentSkill.destroy({
                    where: { agent_id: agentId },
                    transaction,
                });
                if (skillSlugs.length > 0) {
                    await AgentSkill.bulkCreate(
                        skillSlugs.map((skillSlug) => ({
                            agent_id: agentId,
                            skill_slug: skillSlug,
                        })),
                        { transaction }
                    );
                }

                return {
                    id: agentId,
                    name: parsed.agent.name,
                    version: parsed.agent.version,
                    updated: existing && Number(existing.is_delete) !== 1,
                    contentHash: parsed.agent.contentHash,
                };
            });

            if (
                existing &&
                existing.content_hash &&
                existing.content_hash !== parsed.agent.contentHash
            ) {
                this.removeDirectory(
                    path.join(
                        this.getAgentMarketConfig().storageDir,
                        `${parsed.agent.name}/${existing.content_hash}`
                    )
                );
            }

            return result;
        } catch (error) {
            touchedDirs.forEach((dir) => this.removeDirectory(dir));
            throw error;
        }
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

        const { count, rows } = await Agent.findAndCountAll({
            where,
            order: [
                ['updated_at', 'DESC'],
                ['id', 'DESC'],
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

        const { Agent, AgentFile, AgentSkill } = this.app.model;
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
            await AgentFile.destroy({
                where: { agent_id: row.id },
                transaction,
            });
            await AgentSkill.destroy({
                where: { agent_id: row.id },
                transaction,
            });
        });

        try {
            this.removeDirectory(
                path.join(this.getAgentMarketConfig().storageDir, `${row.name}/${row.content_hash}`)
            );
        } catch (error) {
            this.ctx.logger.warn(`[agents] 清理资源目录失败: ${error.message}`);
        }

        return {
            name: row.name,
            deleted: true,
        };
    }
}

module.exports = AgentsService;
