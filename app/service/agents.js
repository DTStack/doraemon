const Service = require('egg').Service;
const AdmZip = require('adm-zip');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const mime = require('mime-types');

const {
    normalizeRelativePath,
    extractSkillMdDescription,
    extractSkillMdName,
} = require('../utils/skill-utils');
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
            this.storageReady = true;
        })();

        try {
            await this.storageReadyPromise;
        } finally {
            this.storageReadyPromise = null;
        }
    }

    normalizeAgentPath(filePath, message = '非法文件路径') {
        const normalized = normalizeRelativePath(String(filePath || '').replace(/^\.\//, ''));
        if (!normalized) {
            this.ctx.throw(400, message);
        }
        return normalized;
    }

    // agent.yaml 里的 ref 指向目录（skills/bugfix-workflow）或 SKILL.md 本身，
    // 统一归一化为包内 SKILL.md 相对路径，供 agent_files 精确匹配。
    resolveSkillMdPath(refOrPath) {
        const normalized = String(refOrPath || '').trim();
        if (!normalized) return '';
        return normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}/SKILL.md`;
    }

    lookupSkillMd(skillMdMap, refOrPath) {
        if (!skillMdMap) return '';
        return skillMdMap.get(this.resolveSkillMdPath(refOrPath)) || '';
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

    detectImageMime(buffer) {
        if (!buffer || buffer.length < 12) return '';

        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
            return 'image/png';
        }

        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff) {
            return 'image/jpeg';
        }

        if (
            buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
            buffer.subarray(8, 12).toString('ascii') === 'WEBP'
        ) {
            return 'image/webp';
        }

        return '';
    }

    buildAssetTargetPath(agentName, contentHash, filePath) {
        const normalized = this.normalizeAgentPath(filePath);
        const parts = normalized.split('/');
        const assetsIndex = parts.indexOf('assets');
        if (assetsIndex === -1) {
            this.ctx.throw(400, '资源路径必须位于 assets 目录');
        }
        const assetSubPath = parts.slice(assetsIndex + 1).join('/');
        if (!assetSubPath) {
            this.ctx.throw(400, '资源路径必须位于 assets 目录');
        }
        return this.normalizeAgentPath(`${agentName}/${contentHash}/assets/${assetSubPath}`);
    }

    buildAssetUrl(agentName, assetPath) {
        return `/api/agents/asset?name=${encodeURIComponent(agentName)}&path=${encodeURIComponent(
            assetPath
        )}`;
    }

    buildSkillRelations(agentName, manifest) {
        const relations = [];
        const used = new Set();
        const entrypointName = String(manifest?.spec?.entrypoint?.name || '').trim();

        if (entrypointName) {
            relations.push({
                agentName,
                skillSlug: entrypointName,
                relationType: 'entrypoint',
                sortOrder: 0,
            });
            used.add(`entrypoint:${entrypointName}`);
        }

        const dependencySkills = Array.isArray(manifest?.spec?.dependencies?.skills)
            ? manifest.spec.dependencies.skills
            : [];

        dependencySkills.forEach((item, index) => {
            const skillSlug = String(item || '').trim();
            if (!skillSlug) return;
            const key = `dependency:${skillSlug}`;
            if (used.has(key)) return;
            used.add(key);
            relations.push({
                agentName,
                skillSlug,
                relationType: 'dependency',
                sortOrder: index,
            });
        });

        const privateSkills = Array.isArray(manifest?.spec?.privateSkills)
            ? manifest.spec.privateSkills
            : [];

        privateSkills.forEach((item, index) => {
            const skillSlug = String(item || '').trim();
            if (!skillSlug) return;
            const key = `private:${skillSlug}`;
            if (used.has(key)) return;
            used.add(key);
            relations.push({
                agentName,
                skillSlug,
                relationType: 'private',
                sortOrder: index,
            });
        });

        return relations;
    }

    buildRelatedAgents(target, candidates = [], limit = 3) {
        const targetDependencies = new Set(
            (target?.dependencies || []).map((item) => String(item || '').trim()).filter(Boolean)
        );

        return candidates
            .filter((item) => item && item.name !== target.name)
            .map((item) => {
                const dependencies = Array.isArray(item.dependencies) ? item.dependencies : [];
                const overlap = dependencies.filter((skill) =>
                    targetDependencies.has(skill)
                ).length;
                return {
                    ...item,
                    overlapCount: overlap,
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
            .slice(0, Number(limit) || 3);
    }

    parseAgentYaml(rawContent) {
        try {
            return yaml.load(rawContent);
        } catch (error) {
            this.ctx.throw(400, `agent.yaml 解析失败: ${error.message}`);
        }
    }

    getDemoImagePath(item, index) {
        // demo.images 只接受 src，避免和其他文件路径字段语义混淆
        return this.normalizeAgentPath(item?.src || '', `spec.demo.images[${index}] 路径非法`);
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

    validateManifest(manifest, fileMap) {
        if (!manifest || typeof manifest !== 'object') {
            this.ctx.throw(400, 'agent.yaml 内容无效');
        }
        if (manifest.apiVersion !== 'doraemon.dtstack.com/v1') {
            this.ctx.throw(400, 'apiVersion 仅支持 doraemon.dtstack.com/v1');
        }
        if (manifest.kind !== 'Agent') {
            this.ctx.throw(400, 'kind 必须为 Agent');
        }

        const metadata = manifest.metadata || {};
        const spec = manifest.spec || {};
        const author = metadata.author || {};
        const entrypoint = spec.entrypoint || {};

        const name = this.validateAgentName(metadata.name);
        const version = this.validateAgentVersion(metadata.version);
        const category = String(metadata.category || '').trim();

        if (!isValidSkillCategory(category)) {
            this.ctx.throw(400, `category 无效，可选: ${SKILL_CATEGORY_OPTIONS.join(', ')}`);
        }

        const displayName = String(metadata.displayName || '').trim();
        if (!displayName) {
            this.ctx.throw(400, 'metadata.displayName 不能为空');
        }

        const description = String(metadata.description || '').trim();
        if (!description) {
            this.ctx.throw(400, 'metadata.description 不能为空');
        }

        const authorName = String(author.name || '').trim();
        if (!authorName) {
            this.ctx.throw(400, 'metadata.author.name 不能为空');
        }

        const profile = String(spec.profile || '').trim();
        if (!profile) {
            this.ctx.throw(400, 'spec.profile 不能为空');
        }

        const logoPath = this.normalizeAgentPath(metadata.logo, 'metadata.logo 路径非法');
        if (!fileMap.has(logoPath)) {
            this.ctx.throw(400, `Logo 文件不存在: ${logoPath}`);
        }

        const entrypointRef = this.normalizeAgentPath(
            entrypoint.ref,
            'spec.entrypoint.ref 路径非法'
        );
        if (!fileMap.has(`${entrypointRef}/SKILL.md`) && !fileMap.has(entrypointRef)) {
            this.ctx.throw(400, `入口 Skill 不存在: ${entrypointRef}`);
        }

        const prompts = Array.isArray(spec.prompts) ? spec.prompts : [];
        const capabilities = this.normalizeCapabilities(spec.capabilities);
        const demoImages = Array.isArray(spec?.demo?.images) ? spec.demo.images : [];

        demoImages.forEach((item, index) => {
            const targetPath = this.getDemoImagePath(item, index);
            if (!fileMap.has(targetPath)) {
                this.ctx.throw(400, `Demo 图片不存在: ${targetPath}`);
            }
        });

        return {
            name,
            displayName,
            version,
            description,
            authorName,
            category,
            tags: Array.isArray(metadata.tags) ? metadata.tags.map((item) => String(item)) : [],
            profile,
            prompts: prompts.map((item) => ({
                title: String(item?.title || '').trim(),
                prompt: String(item?.prompt || '').trim(),
            })),
            capabilities,
            logoPath,
            demoImages,
            entrypoint: {
                host: String(entrypoint.host || '').trim(),
                type: String(entrypoint.type || '').trim(),
                name: String(entrypoint.name || '').trim(),
                ref: entrypointRef,
            },
            dependencySkills: Array.isArray(spec?.dependencies?.skills)
                ? spec.dependencies.skills.map((item) => String(item || '').trim()).filter(Boolean)
                : [],
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
        const agentYamlPath = `${rootDir}/agent.yaml`;
        const agentYamlEntry = fileMap.get(agentYamlPath);
        if (!agentYamlEntry) {
            this.ctx.throw(400, 'ZIP 中缺少根目录 agent.yaml');
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

        const manifest = this.parseAgentYaml(agentYamlEntry.buffer.toString('utf8'));
        const validated = this.validateManifest(manifest, relativeFileMap);
        const contentHash = this.buildContentHash(
            fileRecords.map((item) => ({
                filePath: item.filePath,
                buffer: item.buffer,
            }))
        );

        const logoRecord = relativeFileMap.get(validated.logoPath);
        const logoMimeType = this.detectImageMime(logoRecord.buffer);
        if (!logoMimeType) {
            this.ctx.throw(400, 'Logo 文件类型仅支持 PNG、JPEG、WebP');
        }
        if (logoRecord.size > config.maxImageSize) {
            this.ctx.throw(400, `Logo 文件超过大小限制: ${validated.logoPath}`);
        }

        const demoImages = validated.demoImages.map((item, index) => {
            const rawPath = this.getDemoImagePath(item, index);
            const record = relativeFileMap.get(rawPath);
            const mimeType = this.detectImageMime(record.buffer);
            if (!mimeType) {
                this.ctx.throw(400, `Demo 图片类型仅支持 PNG、JPEG、WebP: ${rawPath}`);
            }
            if (record.size > config.maxImageSize) {
                this.ctx.throw(400, `Demo 图片超过大小限制: ${rawPath}`);
            }

            const storedPath = this.buildAssetTargetPath(validated.name, contentHash, rawPath);
            return {
                path: storedPath,
                originalPath: rawPath,
                mimeType,
                size: record.size,
                hash: crypto.createHash('sha256').update(record.buffer).digest('hex'),
                alt: String(item.alt || '').trim(),
                sortOrder: index,
                buffer: record.buffer,
            };
        });

        const logoPath = this.buildAssetTargetPath(validated.name, contentHash, validated.logoPath);
        const logo = {
            path: logoPath,
            originalPath: validated.logoPath,
            mimeType: logoMimeType,
            size: logoRecord.size,
            hash: crypto.createHash('sha256').update(logoRecord.buffer).digest('hex'),
            buffer: logoRecord.buffer,
        };

        const files = [...relativeFileMap.values()]
            .filter((item) => !item.relativePath.startsWith('assets/'))
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

        return {
            agent: {
                name: validated.name,
                displayName: validated.displayName,
                version: validated.version,
                description: validated.description,
                profile: validated.profile,
                authorName: validated.authorName,
                category: validated.category,
                tags: validated.tags,
                prompts: validated.prompts,
                capabilities: validated.capabilities,
                entrypointHost: validated.entrypoint.host,
                entrypointType: validated.entrypoint.type,
                entrypointName: validated.entrypoint.name,
                entrypointRef: validated.entrypoint.ref,
                logoPath: logo.path,
                logoMimeType: logo.mimeType,
                logoSize: logo.size,
                logoHash: logo.hash,
                contentHash,
                fileCount: fileRecords.length,
            },
            logo,
            demoImages,
            files,
            skillRelations: this.buildSkillRelations(validated.name, manifest),
            assetFiles: [logo, ...demoImages],
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

    async findSkillIdBySlug(skillSlug, transaction) {
        const { SkillsItem } = this.app.model;
        if (!SkillsItem) return null;
        const row = await SkillsItem.findOne({
            where: {
                slug: skillSlug,
                is_delete: 0,
            },
            transaction,
        });
        return row ? row.id : null;
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
        const { Agent, AgentFile, AgentSkill } = this.app.model;
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
                    profile: parsed.agent.profile,
                    author_name: parsed.agent.authorName,
                    category: parsed.agent.category,
                    tags: JSON.stringify(parsed.agent.tags || []),
                    prompts: JSON.stringify(parsed.agent.prompts || []),
                    capabilities: JSON.stringify(parsed.agent.capabilities || []),
                    demo_images: JSON.stringify(
                        parsed.demoImages.map((item) => ({
                            path: item.path,
                            mimeType: item.mimeType,
                            size: item.size,
                            hash: item.hash,
                            alt: item.alt,
                            sortOrder: item.sortOrder,
                        }))
                    ),
                    entrypoint_host: parsed.agent.entrypointHost,
                    entrypoint_type: parsed.agent.entrypointType,
                    entrypoint_name: parsed.agent.entrypointName,
                    entrypoint_ref: parsed.agent.entrypointRef,
                    logo_path: parsed.agent.logoPath,
                    logo_mime_type: parsed.agent.logoMimeType,
                    logo_size: parsed.agent.logoSize,
                    logo_hash: parsed.agent.logoHash,
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
                    await AgentSkill.destroy({
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

                const relationRows = [];
                for (const item of parsed.skillRelations) {
                    const skillId = await this.findSkillIdBySlug(item.skillSlug, transaction);
                    relationRows.push({
                        agent_id: agentId,
                        skill_slug: item.skillSlug,
                        skill_id: skillId,
                        relation_type: item.relationType,
                        sort_order: item.sortOrder,
                    });
                }

                if (relationRows.length > 0) {
                    await AgentSkill.bulkCreate(relationRows, { transaction });
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

    toAgentListItem(row) {
        const dependencies = this.parseJsonArray(row.dependencies || '[]');
        return {
            name: row.name,
            displayName: row.display_name,
            description: row.description || '',
            authorName: row.author_name || '',
            category: row.category || '通用',
            tags: this.parseJsonArray(row.tags),
            version: row.version || '',
            updatedAt: row.updated_at ? row.updated_at.toISOString() : '',
            dependencyCount: dependencies.length,
            logoUrl: this.buildAssetUrl(row.name, row.logo_path),
        };
    }

    async queryAgentList(params = {}) {
        await this.ensureStorageReady();
        const { Agent, AgentSkill } = this.app.model;
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

        const agentIds = rows.map((row) => row.id);
        const relationRows =
            agentIds.length > 0
                ? await AgentSkill.findAll({
                      where: {
                          agent_id: {
                              [Op.in]: agentIds,
                          },
                          relation_type: {
                              [Op.in]: ['dependency', 'private'],
                          },
                      },
                  })
                : [];

        const dependencyMap = relationRows.reduce((acc, item) => {
            if (!acc[item.agent_id]) {
                acc[item.agent_id] = [];
            }
            acc[item.agent_id].push(item.skill_slug);
            return acc;
        }, {});

        const list = rows.map((row) =>
            this.toAgentListItem({
                ...row.toJSON(),
                dependencies: JSON.stringify(dependencyMap[row.id] || []),
            })
        );

        return {
            list,
            total: count,
            pageNum,
            pageSize,
            categories: [...SKILL_CATEGORY_OPTIONS],
        };
    }

    async getAgentDetail(name) {
        await this.ensureStorageReady();
        const { Agent, AgentSkill, SkillsItem, AgentFile } = this.app.model;
        const { Op } = this.app.Sequelize;
        const row = await Agent.findOne({
            where: {
                name,
                is_delete: 0,
            },
        });
        if (!row) {
            this.ctx.throw(404, 'Agent 不存在');
        }

        const relations = await AgentSkill.findAll({
            where: {
                agent_id: row.id,
            },
            order: [
                ['relation_type', 'ASC'],
                ['sort_order', 'ASC'],
                ['id', 'ASC'],
            ],
        });

        const skillSlugs = relations.map((item) => item.skill_slug);
        const skillRows =
            skillSlugs.length > 0 && SkillsItem
                ? await SkillsItem.findAll({
                      where: {
                          slug: skillSlugs,
                          is_delete: 0,
                      },
                  })
                : [];
        const skillMap = new Map(skillRows.map((item) => [item.slug, item]));

        const entrypoint = relations.find((item) => item.relation_type === 'entrypoint') || null;
        const entrypointSkill = entrypoint ? skillMap.get(entrypoint.skill_slug) : null;

        const dependencies = relations
            .filter((item) => item.relation_type === 'dependency')
            .map((item) => {
                const skill = skillMap.get(item.skill_slug);
                return {
                    slug: item.skill_slug,
                    name: skill ? skill.name : item.skill_slug,
                    description: skill ? skill.description : '',
                    collected: Boolean(skill),
                    path: skill ? `/page/skills/${item.skill_slug}` : '',
                };
            });
        const privateSkills = relations
            .filter((item) => item.relation_type === 'private')
            .map((item) => ({
                slug: item.skill_slug,
                name: item.skill_slug,
                description: '',
                collected: false,
                builtin: true,
                path: '',
            }));

        // 未收录的入口 Skill 和内置 Skills 不在 SkillsItem 表，其真实 name/description
        // 从 agent 包内自带的 SKILL.md 解析（agent_files 已在导入时保存文件内容）。
        const skillMdPaths = [
            ...(entrypoint && !entrypointSkill
                ? [this.resolveSkillMdPath(row.entrypoint_ref)]
                : []),
            ...privateSkills.map((item) => `skills/${item.slug}/SKILL.md`),
            ...dependencies
                .filter((item) => !item.collected)
                .map((item) => `skills/${item.slug}/SKILL.md`),
        ].filter(Boolean);
        const skillMdRows =
            skillMdPaths.length > 0 && AgentFile
                ? await AgentFile.findAll({
                      where: {
                          agent_id: row.id,
                          file_path: { [Op.in]: skillMdPaths },
                          is_delete: 0,
                      },
                  })
                : [];
        const skillMdMap = new Map(skillMdRows.map((item) => [item.file_path, item.content || '']));

        // 入口 Skill：已收录用 SkillsItem 描述；未收录回填包内 SKILL.md 的 name/description
        const entrypointItem = entrypoint
            ? (() => {
                  const skill = entrypointSkill;
                  const skillMd = skill ? '' : this.lookupSkillMd(skillMdMap, row.entrypoint_ref);
                  return {
                      slug: entrypoint.skill_slug,
                      name: skill
                          ? skill.name
                          : extractSkillMdName(skillMd) || entrypoint.skill_slug,
                      description: skill
                          ? skill.description || ''
                          : extractSkillMdDescription(skillMd),
                      collected: Boolean(skill),
                      path: `/page/skills/${entrypoint.skill_slug}`,
                  };
              })()
            : null;

        // 内置 Skills：总是从包内 SKILL.md 回填
        privateSkills.forEach((item) => {
            const skillMd = skillMdMap.get(`skills/${item.slug}/SKILL.md`) || '';
            const name = extractSkillMdName(skillMd);
            if (name) item.name = name;
            const description = extractSkillMdDescription(skillMd);
            if (description) item.description = description;
        });

        // 未收录的依赖 Skills：包内有 SKILL.md 时同样回填
        dependencies.forEach((item) => {
            if (item.collected) return;
            const skillMd = skillMdMap.get(`skills/${item.slug}/SKILL.md`) || '';
            const name = extractSkillMdName(skillMd);
            if (name) item.name = name;
            const description = extractSkillMdDescription(skillMd);
            if (description) item.description = description;
        });

        const detail = row.toJSON();
        const demoImages = this.parseJsonArray(detail.demo_images).map((item) => ({
            ...item,
            url: this.buildAssetUrl(detail.name, item.path),
        }));
        const capabilities = this.normalizeCapabilities(this.parseJsonArray(detail.capabilities));

        return {
            name: detail.name,
            displayName: detail.display_name,
            description: detail.description || '',
            profile: detail.profile || '',
            authorName: detail.author_name || '',
            category: detail.category || '通用',
            tags: this.parseJsonArray(detail.tags),
            prompts: this.parseJsonArray(detail.prompts),
            capabilities,
            version: detail.version || '',
            logoUrl: this.buildAssetUrl(detail.name, detail.logo_path),
            logoPath: detail.logo_path,
            demoImages,
            entrypoint: entrypointItem,
            dependencies,
            privateSkills,
            updatedAt: detail.updated_at ? detail.updated_at.toISOString() : '',
        };
    }

    async getRelatedAgents(name, limit = 3) {
        await this.ensureStorageReady();
        const { Agent, AgentSkill } = this.app.model;
        const target = await Agent.findOne({
            where: {
                name,
                is_delete: 0,
            },
        });
        if (!target) {
            this.ctx.throw(404, 'Agent 不存在');
        }

        const [allAgents, allRelations] = await Promise.all([
            Agent.findAll({
                where: { is_delete: 0 },
                order: [['updated_at', 'DESC']],
            }),
            AgentSkill.findAll({
                where: { relation_type: 'dependency' },
            }),
        ]);

        const dependencyMap = allRelations.reduce((acc, item) => {
            if (!acc[item.agent_id]) {
                acc[item.agent_id] = [];
            }
            acc[item.agent_id].push(item.skill_slug);
            return acc;
        }, {});

        const targetDependencies = dependencyMap[target.id] || [];
        const candidates = allAgents.map((item) => ({
            name: item.name,
            displayName: item.display_name,
            description: item.description || '',
            logoUrl: this.buildAssetUrl(item.name, item.logo_path),
            dependencies: dependencyMap[item.id] || [],
            updatedAt: item.updated_at ? item.updated_at.toISOString() : '',
        }));

        return this.buildRelatedAgents(
            {
                name: target.name,
                dependencies: targetDependencies,
                entrypointName: target.entrypoint_name,
            },
            candidates,
            limit
        );
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

        const demoImages = this.parseJsonArray(row.demo_images);
        const allowedPaths = new Map();
        if (row.logo_path) {
            allowedPaths.set(row.logo_path, row.logo_mime_type || 'application/octet-stream');
        }
        demoImages.forEach((item) => {
            allowedPaths.set(item.path, item.mimeType || 'application/octet-stream');
        });

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
