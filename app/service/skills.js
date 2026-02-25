const Service = require('egg').Service;
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');

const CACHE_TTL_MS = 60 * 1000;
const MAX_FILE_LIST_COUNT = 2000;
const MAX_FILE_CONTENT_SIZE = 2 * 1024 * 1024;
const MAX_STORED_FILE_CONTENT_SIZE = 8 * 1024 * 1024;
const GIT_COMMAND_TIMEOUT_MS = 120 * 1000;
const GITHUB_API_TIMEOUT_MS = 10 * 1000;
const MAX_PLATFORM_TAGS = 5;
const MAX_TAG_LENGTH = 20;
const DISCOVER_DEPTH_LIMIT = 2;
const SKILLS_ROOT_DISCOVER_DEPTH_LIMIT = 8;
const DISCOVER_MAX_DIR_COUNT = 3000;

const SKILL_CATEGORY_OPTIONS = [
    '通用',
    '前端',
    '后端',
    '数据与AI',
    '运维与系统',
    '工程效率',
    '安全',
    '其他',
];

const EXTENSION_LANGUAGE_MAP = {
    '.md': 'markdown',
    '.markdown': 'markdown',
    '.js': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.json': 'json',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash',
    '.py': 'python',
    '.go': 'go',
    '.java': 'java',
    '.kt': 'kotlin',
    '.rb': 'ruby',
    '.php': 'php',
    '.rs': 'rust',
    '.swift': 'swift',
    '.xml': 'xml',
    '.sql': 'sql',
    '.toml': 'toml',
    '.ini': 'ini',
    '.conf': 'ini',
    '.txt': 'text',
    '.log': 'text',
};

class SkillsService extends Service {
    constructor(ctx) {
        super(ctx);
        this.skillCache = null;
        this.storageReady = false;
        this.storageReadyPromise = null;
    }

    getSkillCategoryOptions() {
        return [ ...SKILL_CATEGORY_OPTIONS ];
    }

    getSkillsConfig() {
        return this.app.config.skills || {};
    }

    resolveGitHubToken() {
        const token = this.getSkillsConfig().githubToken;
        return String(token || '').trim();
    }

    invalidateCache() {
        this.skillCache = null;
    }

    isCacheValid() {
        return (
            this.skillCache &&
            this.skillCache.loadedAt &&
            Date.now() - this.skillCache.loadedAt < CACHE_TTL_MS
        );
    }

    async ensureStorageReady() {
        if (this.storageReady) return;
        if (this.storageReadyPromise) {
            await this.storageReadyPromise;
            return;
        }

        this.storageReadyPromise = (async () => {
            const { SkillsSource, SkillsItem, SkillsFile } = this.app.model;
            if (!SkillsSource || !SkillsItem || !SkillsFile) {
                this.ctx.throw(500, 'Skills 数据模型未加载');
            }

            await SkillsSource.sync();
            await SkillsItem.sync();
            await SkillsFile.sync();
            this.storageReady = true;
        })();

        try {
            await this.storageReadyPromise;
        } finally {
            this.storageReadyPromise = null;
        }
    }

    parseJsonArray(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value !== 'string') return [];

        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
        } catch (error) {
            return [];
        }
    }

    toPublicSkill(skill) {
        return {
            slug: skill.slug,
            name: skill.name,
            description: skill.description,
            category: skill.category,
            tags: skill.tags,
            allowedTools: skill.allowedTools,
            stars: skill.stars,
            updatedAt: skill.updatedAt,
            sourceRepo: skill.sourceRepo,
            sourcePath: skill.sourcePath,
            installCommand: skill.installCommand,
        };
    }

    toSkillDto(row) {
        return {
            id: row.id,
            sourceId: row.source_id,
            slug: row.slug,
            name: row.name || '',
            description: row.description || '',
            category: row.category || '通用',
            tags: this.parseJsonArray(row.tags),
            allowedTools: this.parseJsonArray(row.allowed_tools),
            stars: Number(row.stars) || 0,
            updatedAt: (row.updated_at_remote || row.updated_at || row.created_at || new Date()).toISOString(),
            sourceRepo: row.source_repo || '',
            sourcePath: row.source_path || '',
            skillMd: row.skill_md || '',
            installCommand: row.install_command || '',
            fileCount: Number(row.file_count) || 0,
        };
    }

    async ensureSkillCache() {
        if (this.isCacheValid()) return this.skillCache;

        await this.ensureStorageReady();
        const { SkillsItem } = this.app.model;
        const rows = await SkillsItem.findAll({
            where: { is_delete: 0 },
            order: [
                [ 'stars', 'DESC' ],
                [ 'updated_at_remote', 'DESC' ],
                [ 'updated_at', 'DESC' ],
                [ 'id', 'DESC' ],
            ],
        });

        const skills = rows.map((row) => this.toSkillDto(row));
        const categories = this.getSkillCategoryOptions();
        this.skillCache = {
            loadedAt: Date.now(),
            skills,
            categories,
            bySlug: new Map(skills.map((item) => [ item.slug, item ])),
        };

        return this.skillCache;
    }

    getSkillList(params = {}) {
        const {
            keyword = '',
            sortBy = 'stars',
            category = '',
            pageNum = 1,
            pageSize = 20,
        } = params;

        const safePageNum = Math.max(parseInt(pageNum, 10) || 1, 1);
        const safePageSize = Math.max(parseInt(pageSize, 10) || 20, 1);
        const { skills, categories } = this.skillCache;

        let list = [ ...skills ];
        if (keyword) {
            const value = String(keyword).toLowerCase();
            list = list.filter(
                (item) =>
                    item.name.toLowerCase().includes(value) ||
                    item.description.toLowerCase().includes(value) ||
                    item.sourceRepo.toLowerCase().includes(value) ||
                    item.tags.some((tag) => tag.toLowerCase().includes(value))
            );
        }

        if (category) {
            list = list.filter((item) => item.category === category);
        }

        list.sort((a, b) => {
            if (sortBy === 'recent') {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
            if (b.stars !== a.stars) return b.stars - a.stars;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        const total = list.length;
        const offset = (safePageNum - 1) * safePageSize;
        const pageList = list.slice(offset, offset + safePageSize).map((item) => this.toPublicSkill(item));

        return {
            list: pageList,
            total,
            pageNum: safePageNum,
            pageSize: safePageSize,
            categories,
        };
    }

    async querySkillList(params = {}) {
        await this.ensureSkillCache();
        return this.getSkillList(params);
    }

    getSkillBySlug(slug) {
        const value = String(slug || '').trim();
        if (!value) {
            this.ctx.throw(400, '缺少技能标识');
        }

        const skill = this.skillCache.bySlug.get(value);
        if (!skill) {
            this.ctx.throw(404, '技能不存在');
        }

        return skill;
    }

    async getSkillDetail(slug) {
        await this.ensureSkillCache();
        const skill = this.getSkillBySlug(slug);
        const { SkillsFile } = this.app.model;

        const rows = await SkillsFile.findAll({
            where: {
                skill_id: skill.id,
                is_delete: 0,
            },
            attributes: [ 'file_path' ],
            order: [ [ 'file_path', 'ASC' ] ],
            limit: MAX_FILE_LIST_COUNT,
        });

        return {
            ...this.toPublicSkill(skill),
            skillMd: skill.skillMd,
            fileList: rows.map((row) => row.file_path),
        };
    }

    async getSkillFileContent(slug, filePath) {
        await this.ensureSkillCache();
        const skill = this.getSkillBySlug(slug);
        const normalizedPath = this.normalizeRelativePath(filePath);
        const { SkillsFile } = this.app.model;

        const row = await SkillsFile.findOne({
            where: {
                skill_id: skill.id,
                file_path: normalizedPath,
                is_delete: 0,
            },
        });

        if (!row) {
            this.ctx.throw(404, '文件不存在');
        }

        if (Number(row.size) > MAX_FILE_CONTENT_SIZE || !row.content) {
            this.ctx.throw(413, '文件过大，无法在线预览');
        }

        return {
            slug: skill.slug,
            path: row.file_path,
            language: row.language || 'text',
            size: Number(row.size) || 0,
            readonly: true,
            isBinary: Boolean(row.is_binary),
            encoding: row.encoding || 'utf8',
            content: row.content || '',
        };
    }

    async getSkillArchive(slug) {
        await this.ensureSkillCache();
        const skill = this.getSkillBySlug(slug);
        const { SkillsFile } = this.app.model;
        const rows = await SkillsFile.findAll({
            where: {
                skill_id: skill.id,
                is_delete: 0,
            },
            order: [ [ 'file_path', 'ASC' ] ],
            limit: MAX_FILE_LIST_COUNT,
        });

        const zip = new AdmZip();
        const rootFolder = this.sanitizeFileName(skill.name || skill.slug || 'skill');
        rows.forEach((row) => {
            const safeRelativePath = this.normalizeRelativePath(row.file_path);
            const zipPath = path.posix.join(rootFolder, safeRelativePath);
            const buffer = this.decodeStoredFileContent(row.content, Boolean(row.is_binary));
            zip.addFile(zipPath, buffer);
        });

        return {
            fileName: `${rootFolder}.zip`,
            content: zip.toBuffer(),
        };
    }

    decodeStoredFileContent(content, isBinary) {
        if (!content) return Buffer.from('');
        if (isBinary) {
            try {
                return Buffer.from(content, 'base64');
            } catch (error) {
                return Buffer.from('');
            }
        }
        return Buffer.from(content, 'utf8');
    }

    normalizeRelativePath(filePath) {
        const value = String(filePath || '').trim();
        if (!value) {
            this.ctx.throw(400, '缺少文件路径');
        }

        const normalized = path
            .normalize(value)
            .replace(/\\/g, '/')
            .replace(/^\/+/, '');

        if (!normalized || normalized === '.' || normalized.startsWith('..')) {
            this.ctx.throw(400, '非法文件路径');
        }

        return normalized;
    }

    isLikelyBinary(buffer) {
        if (!buffer || buffer.length === 0) return false;
        const sampleLength = Math.min(buffer.length, 1024);
        for (let i = 0; i < sampleLength; i += 1) {
            if (buffer[i] === 0) return true;
        }
        return false;
    }

    sanitizeFileName(fileName) {
        return String(fileName || 'skill')
            .trim()
            .replace(/[^a-zA-Z0-9._-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();
    }

    sanitizeSlugSegment(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-{2,}/g, '-');
    }

    hashString(value) {
        let hash = 0;
        const text = String(value || '');
        for (let i = 0; i < text.length; i += 1) {
            hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
        }
        return hash.toString(16);
    }

    buildSkillSlug(sourceMeta, relativeSkillPath, skillName, usedSlugs = new Set()) {
        const sourceKey = `${sourceMeta.repoHost || 'local'}-${sourceMeta.repoPath || sourceMeta.sourceUrl || ''}-${sourceMeta.ref || 'default'}`;
        const relativeKey = String(relativeSkillPath || skillName || 'skill').replace(/\\/g, '/');
        const base = this.sanitizeSlugSegment(`${sourceKey}-${relativeKey}`) || 'skill';
        let slug = base;

        if (slug.length > 220) {
            slug = `${slug.slice(0, 200)}-${this.hashString(base).slice(0, 12)}`;
        }

        let index = 2;
        while (usedSlugs.has(slug)) {
            const suffix = `-${index}`;
            const head = slug.length + suffix.length > 255 ? slug.slice(0, 255 - suffix.length) : slug;
            slug = `${head}${suffix}`;
            index += 1;
        }

        usedSlugs.add(slug);
        return slug;
    }

    async getRelatedSkills(slug, limit = 6) {
        await this.ensureSkillCache();
        const target = this.skillCache.bySlug.get(String(slug || '').trim());
        if (!target) {
            this.ctx.throw(404, '技能不存在');
        }

        const targetTags = new Set((target.tags || []).map((item) => item.toLowerCase()));
        const related = this.skillCache.skills
            .filter((item) => item.slug !== target.slug)
            .map((item) => {
                const itemTags = (item.tags || []).map((tag) => tag.toLowerCase());
                const overlap = itemTags.filter((tag) => targetTags.has(tag)).length;
                const categoryScore = item.category === target.category ? 3 : 0;
                const score = overlap * 10 + categoryScore + Math.min(item.stars, 10);
                return { ...item, _score: score };
            })
            .filter((item) => item._score > 0)
            .sort((a, b) => b._score - a._score || b.stars - a.stars)
            .slice(0, Math.max(parseInt(limit, 10) || 6, 1))
            .map((item) => {
                const rest = { ...item };
                delete rest._score;
                return this.toPublicSkill(rest);
            });

        return related;
    }

    normalizeCategory(rawCategory) {
        const category = String(rawCategory || '').trim();
        if (!category) return '通用';
        if (SKILL_CATEGORY_OPTIONS.includes(category)) {
            return category;
        }
        return '其他';
    }

    parseArrayLike(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value !== 'string') return [];
        const trimmed = value.trim();

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const normalized = trimmed.replace(/'/g, '"');
                const parsed = JSON.parse(normalized);
                return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
            } catch (error) {
                return trimmed
                    .slice(1, -1)
                    .split(',')
                    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
                    .filter(Boolean);
            }
        }

        return trimmed
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    normalizePlatformTags(rawTags) {
        const values = this.parseArrayLike(rawTags)
            .map((item) => String(item || '').trim())
            .map((item) => item.replace(/\s+/g, ' '))
            .filter(Boolean)
            .map((item) => item.slice(0, MAX_TAG_LENGTH));

        return Array.from(new Set(values)).slice(0, MAX_PLATFORM_TAGS);
    }

    getInstallCommand({ sourceRepo, sourceUrl, name }) {
        const source = String(sourceRepo || sourceUrl || '').trim();
        if (!source) return '';
        if (/^upload:\/\//i.test(source)) return '';
        return `npx skills add ${source} --skill "${name}"`;
    }

    buildUploadSourceMeta(fileName = '') {
        const baseName = path.basename(String(fileName || '').trim(), '.skill');
        const normalizedName = this.sanitizeSlugSegment(baseName) || 'uploaded-skill';
        return {
            sourceUrl: `upload://${normalizedName}.skill`,
            sourceType: 'upload',
            cloneUrl: '',
            sourceRepo: '',
            ref: '',
            subpath: '',
            repoHost: 'upload',
            repoPath: normalizedName,
            originalAction: 'upload',
        };
    }

    extractDescription(content) {
        const stripped = content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#') && !line.startsWith('---'));
        return stripped[0] || '';
    }

    parseFrontmatter(content) {
        const result = {};
        const text = String(content || '');
        const normalized = text.replace(/\r\n/g, '\n');
        if (!normalized.startsWith('---\n')) return result;

        const endMarkerIndex = normalized.indexOf('\n---\n', 4);
        const endMarkerLength = 5;
        if (endMarkerIndex === -1) return result;

        const frontmatterText = normalized.slice(4, endMarkerIndex);
        const lines = frontmatterText.split('\n');
        let activeKey = '';

        lines.forEach((line) => {
            const keyMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
            if (keyMatch) {
                const key = keyMatch[1];
                const rawValue = keyMatch[2].trim();
                activeKey = key;

                if (!rawValue) {
                    result[key] = [];
                    return;
                }

                if (
                    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
                    (rawValue.startsWith("'") && rawValue.endsWith("'"))
                ) {
                    result[key] = rawValue.slice(1, -1);
                    return;
                }

                if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
                    result[key] = this.parseArrayLike(rawValue);
                    return;
                }

                result[key] = rawValue;
                return;
            }

            if (!activeKey) return;
            const listMatch = line.match(/^\s*-\s+(.*)$/);
            if (!listMatch) {
                activeKey = '';
                return;
            }

            const listValue = listMatch[1].trim().replace(/^['"]|['"]$/g, '');
            if (!Array.isArray(result[activeKey])) {
                result[activeKey] = [];
            }
            result[activeKey].push(listValue);
        });

        if (normalized.length >= endMarkerIndex + endMarkerLength) {
            result.__body = normalized.slice(endMarkerIndex + endMarkerLength);
        }

        return result;
    }

    isLocalPathSource(source) {
        const value = String(source || '').trim();
        if (!value) return false;
        if (/^(https?:\/\/|git@|ssh:\/\/)/i.test(value)) return false;
        return (
            value.startsWith('/') ||
            value.startsWith('./') ||
            value.startsWith('../') ||
            value.startsWith('~/')
        );
    }

    resolveLocalPath(source) {
        const value = String(source || '').trim();
        if (value.startsWith('~/')) {
            const home = process.env.HOME || '';
            return path.join(home, value.slice(2));
        }
        return path.resolve(value);
    }

    inferSourceType(hostname = '', pathSegments = []) {
        const host = String(hostname || '').toLowerCase();
        if (host.includes('github')) return 'github';
        if (host.includes('gitlab')) return 'gitlab';
        if (Array.isArray(pathSegments) && pathSegments.includes('-')) return 'gitlab';
        return 'git';
    }

    parseSshGitSource(source) {
        const match = String(source || '').trim().match(/^git@([^:]+):(.+?)(?:\.git)?$/i);
        if (!match) return null;
        const host = match[1];
        const repoPath = match[2].replace(/^\/+|\/+$/g, '');
        const sourceType = this.inferSourceType(host, repoPath.split('/'));

        return {
            sourceUrl: source,
            sourceType,
            cloneUrl: source,
            sourceRepo: `https://${host}/${repoPath}`,
            ref: '',
            subpath: '',
            repoHost: host,
            repoPath,
            originalAction: '',
        };
    }

    async parseImportSource(source) {
        const value = String(source || '').trim();
        if (!value) {
            this.ctx.throw(400, '缺少导入来源地址');
        }

        if (this.isLocalPathSource(value)) {
            const absolutePath = this.resolveLocalPath(value);
            if (!fs.existsSync(absolutePath)) {
                this.ctx.throw(400, `本地路径不存在: ${absolutePath}`);
            }

            const stat = fs.statSync(absolutePath);
            if (stat.isFile()) {
                return {
                    sourceUrl: value,
                    sourceType: 'local',
                    cloneUrl: path.dirname(absolutePath),
                    sourceRepo: value,
                    ref: '',
                    subpath: path.basename(absolutePath),
                    repoHost: 'local',
                    repoPath: path.basename(path.dirname(absolutePath)),
                    originalAction: 'file',
                };
            }

            return {
                sourceUrl: value,
                sourceType: 'local',
                cloneUrl: absolutePath,
                sourceRepo: value,
                ref: '',
                subpath: '',
                repoHost: 'local',
                repoPath: path.basename(absolutePath),
                originalAction: '',
            };
        }

        const sshSource = this.parseSshGitSource(value);
        if (sshSource) {
            return sshSource;
        }

        let url;
        try {
            url = new URL(value);
        } catch (error) {
            this.ctx.throw(400, `来源地址格式无效: ${value}`);
        }

        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length < 2) {
            this.ctx.throw(400, `无法识别仓库地址: ${value}`);
        }

        let repoSegments = [];
        let action = '';
        let actionTail = [];

        const dashIndex = segments.indexOf('-');
        if (dashIndex > 0 && [ 'tree', 'blob' ].includes(segments[dashIndex + 1])) {
            repoSegments = segments.slice(0, dashIndex);
            action = segments[dashIndex + 1];
            actionTail = segments.slice(dashIndex + 2);
        } else if ([ 'tree', 'blob' ].includes(segments[2])) {
            repoSegments = segments.slice(0, 2);
            action = segments[2];
            actionTail = segments.slice(3);
        } else if (String(url.hostname || '').toLowerCase().includes('github')) {
            repoSegments = segments.slice(0, 2);
        } else {
            repoSegments = segments;
        }

        if (repoSegments.length < 2) {
            this.ctx.throw(400, `无法识别仓库路径: ${value}`);
        }

        const normalizedRepoSegments = [ ...repoSegments ];
        normalizedRepoSegments[normalizedRepoSegments.length - 1] = normalizedRepoSegments[
            normalizedRepoSegments.length - 1
        ].replace(/\.git$/i, '');

        const repoPath = normalizedRepoSegments.join('/');
        const origin = `${url.protocol}//${url.host}`;
        const cloneUrl = `${origin}/${repoPath}.git`;
        let ref = '';
        let subpath = '';

        if (action && actionTail.length > 0) {
            const resolved = await this.resolveRefAndSubpath(cloneUrl, actionTail, action);
            ref = resolved.ref;
            subpath = resolved.subpath;
        }

        return {
            sourceUrl: value,
            sourceType: this.inferSourceType(url.hostname, segments),
            cloneUrl,
            sourceRepo: `${origin}/${repoPath}`,
            ref,
            subpath,
            repoHost: url.host,
            repoPath,
            originalAction: action,
        };
    }

    async resolveRefAndSubpath(cloneUrl, tailSegments = [], action = '') {
        if (!Array.isArray(tailSegments) || tailSegments.length === 0) {
            return { ref: '', subpath: '' };
        }

        const branches = await this.listRemoteHeadRefs(cloneUrl);
        const branchSet = new Set(branches);

        for (let i = tailSegments.length; i >= 1; i -= 1) {
            const candidateRef = tailSegments.slice(0, i).join('/');
            if (branchSet.has(candidateRef)) {
                return {
                    ref: candidateRef,
                    subpath: tailSegments.slice(i).join('/'),
                };
            }
        }

        if (action === 'tree' && tailSegments.length >= 2) {
            return {
                ref: tailSegments.join('/'),
                subpath: '',
            };
        }

        return {
            ref: tailSegments[0],
            subpath: tailSegments.slice(1).join('/'),
        };
    }

    async listRemoteHeadRefs(cloneUrl) {
        if (!cloneUrl) return [];
        const env = this.buildCommandEnv({ remoteUrl: cloneUrl });
        const authArgs = this.getGitAuthPrefixArgs(cloneUrl);
        try {
            const { stdout } = await this.runCommand(
                'git',
                [ ...authArgs, 'ls-remote', '--heads', cloneUrl ],
                GIT_COMMAND_TIMEOUT_MS,
                process.cwd(),
                env
            );
            return String(stdout || '')
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                    const match = line.match(/\s+refs\/heads\/(.+)$/);
                    return match ? match[1] : '';
                })
                .filter(Boolean);
        } catch (error) {
            this.ctx.logger.warn(`[skills] 获取远端分支失败，使用兜底解析: ${error.message}`);
            return [];
        }
    }

    async cloneSourceRepo(parsedSource, targetDir) {
        if (parsedSource.sourceType === 'local') {
            return;
        }

        const env = this.buildCommandEnv({ remoteUrl: parsedSource.cloneUrl });
        const authArgs = this.getGitAuthPrefixArgs(parsedSource.cloneUrl);
        const hasSubpath = Boolean(String(parsedSource.subpath || '').trim());

        // 子目录导入优先使用 sparse clone，避免大仓库全量 clone 导致长时间卡顿。
        if (hasSubpath) {
            const sparseCloneArgs = [ ...authArgs, 'clone', '--depth', '1', '--filter=blob:none', '--sparse' ];
            if (parsedSource.ref) {
                sparseCloneArgs.push('--branch', parsedSource.ref);
            }
            sparseCloneArgs.push(parsedSource.cloneUrl, targetDir);

            try {
                await this.runCommand('git', sparseCloneArgs, GIT_COMMAND_TIMEOUT_MS, process.cwd(), env);
                await this.runCommand(
                    'git',
                    [ '-C', targetDir, 'sparse-checkout', 'set', parsedSource.subpath ],
                    GIT_COMMAND_TIMEOUT_MS,
                    process.cwd(),
                    env
                );
                return;
            } catch (error) {
                this.ctx.logger.warn(`[skills] sparse clone 失败，回退普通 clone: ${error.message}`);
                if (fs.existsSync(targetDir)) {
                    try {
                        fs.rmSync(targetDir, { recursive: true, force: true });
                    } catch (cleanupError) {
                        this.ctx.logger.warn(
                            `[skills] sparse clone 回退清理目录失败: ${targetDir}, ${cleanupError.message}`
                        );
                    }
                }
                fs.mkdirSync(targetDir, { recursive: true });
            }
        }

        const cloneArgs = [ ...authArgs, 'clone', '--depth', '1' ];
        if (parsedSource.ref) {
            cloneArgs.push('--branch', parsedSource.ref);
        }
        cloneArgs.push(parsedSource.cloneUrl, targetDir);

        try {
            await this.runCommand('git', cloneArgs, GIT_COMMAND_TIMEOUT_MS, process.cwd(), env);
        } catch (error) {
            if (!parsedSource.ref) {
                throw error;
            }

            // 分支解析异常时回退默认分支，尽量提升兼容性。
            const fallbackArgs = [
                ...authArgs,
                'clone',
                '--depth',
                '1',
                parsedSource.cloneUrl,
                targetDir,
            ];
            await this.runCommand('git', fallbackArgs, GIT_COMMAND_TIMEOUT_MS, process.cwd(), env);
        }
    }

    resolveSelectedPath(repoDir, subpath = '') {
        const rootPath = path.resolve(repoDir);
        if (!subpath) {
            return rootPath;
        }

        const normalizedSubpath = this.normalizeRelativePath(subpath);
        const targetPath = path.resolve(rootPath, normalizedSubpath);
        if (!this.isPathInsideRoot(rootPath, targetPath) && targetPath !== rootPath) {
            this.ctx.throw(400, '来源子路径非法');
        }

        if (!fs.existsSync(targetPath)) {
            this.ctx.throw(400, `来源子路径不存在: ${normalizedSubpath}`);
        }

        return targetPath;
    }

    isPathInsideRoot(rootPath, targetPath) {
        if (targetPath === rootPath) return true;
        return targetPath.startsWith(`${rootPath}${path.sep}`);
    }

    containsSkillMd(dirPath) {
        const target = path.join(dirPath, 'SKILL.md');
        return fs.existsSync(target) && fs.statSync(target).isFile();
    }

    shouldSkipDirName(dirName) {
        return dirName === '.git' || dirName === 'node_modules' || dirName === '.idea' || dirName === '.vscode';
    }

    findSkillsRootDirs(baseDir, maxDepth = SKILLS_ROOT_DISCOVER_DEPTH_LIMIT) {
        const roots = [];
        const queue = [ { dir: baseDir, depth: 0 } ];
        const visited = new Set();
        let visitCount = 0;

        while (queue.length > 0) {
            const { dir, depth } = queue.shift();
            const normalizedDir = path.resolve(dir);
            if (visited.has(normalizedDir)) continue;
            visited.add(normalizedDir);
            visitCount += 1;
            if (visitCount > DISCOVER_MAX_DIR_COUNT) break;

            if (path.basename(normalizedDir).toLowerCase() === 'skills') {
                roots.push(normalizedDir);
            }

            if (depth >= maxDepth) continue;

            let entries = [];
            try {
                entries = fs.readdirSync(normalizedDir, { withFileTypes: true });
            } catch (error) {
                continue;
            }

            entries.forEach((entry) => {
                if (!entry.isDirectory()) return;
                if (this.shouldSkipDirName(entry.name)) return;
                queue.push({ dir: path.join(normalizedDir, entry.name), depth: depth + 1 });
            });
        }

        return Array.from(new Set(roots));
    }

    findSkillDirsWithin(baseDir, maxDepth = DISCOVER_DEPTH_LIMIT) {
        const result = [];
        const queue = [ { dir: baseDir, depth: 0 } ];
        const visited = new Set();
        let visitCount = 0;

        while (queue.length > 0) {
            const { dir, depth } = queue.shift();
            const normalizedDir = path.resolve(dir);
            if (visited.has(normalizedDir)) continue;
            visited.add(normalizedDir);
            visitCount += 1;
            if (visitCount > DISCOVER_MAX_DIR_COUNT) break;

            if (this.containsSkillMd(normalizedDir)) {
                result.push(normalizedDir);
            }

            if (depth >= maxDepth) continue;

            let entries = [];
            try {
                entries = fs.readdirSync(normalizedDir, { withFileTypes: true });
            } catch (error) {
                continue;
            }

            entries.forEach((entry) => {
                if (!entry.isDirectory()) return;
                if (this.shouldSkipDirName(entry.name)) return;
                queue.push({ dir: path.join(normalizedDir, entry.name), depth: depth + 1 });
            });
        }

        return Array.from(new Set(result));
    }

    discoverSkillDirs(selectedPath) {
        const stat = fs.statSync(selectedPath);
        if (stat.isFile()) {
            if (path.basename(selectedPath) !== 'SKILL.md') {
                this.ctx.throw(400, '文件来源仅支持 SKILL.md');
            }
            return [ path.dirname(selectedPath) ];
        }

        const selectedDir = path.resolve(selectedPath);

        if (this.containsSkillMd(selectedDir)) {
            return [ selectedDir ];
        }

        const roots = this.findSkillsRootDirs(selectedDir, SKILLS_ROOT_DISCOVER_DEPTH_LIMIT);
        let skillDirs = [];

        if (roots.length > 0) {
            roots.forEach((rootDir) => {
                const discovered = this.findSkillDirsWithin(rootDir, DISCOVER_DEPTH_LIMIT);
                skillDirs = skillDirs.concat(discovered);
            });
        }

        if (skillDirs.length === 0) {
            skillDirs = this.findSkillDirsWithin(selectedDir, DISCOVER_DEPTH_LIMIT);
        }

        return Array.from(new Set(skillDirs.map((item) => path.resolve(item))));
    }

    buildFileLanguage(filePath) {
        const extension = path.extname(filePath || '').toLowerCase();
        return EXTENSION_LANGUAGE_MAP[extension] || 'text';
    }

    collectSkillFiles(skillDir) {
        const files = [];
        const queue = [ skillDir ];
        const visited = new Set();

        while (queue.length > 0) {
            const currentDir = queue.shift();
            const normalizedDir = path.resolve(currentDir);
            if (visited.has(normalizedDir)) continue;
            visited.add(normalizedDir);

            let entries = [];
            try {
                entries = fs.readdirSync(normalizedDir, { withFileTypes: true });
            } catch (error) {
                continue;
            }

            entries.forEach((entry) => {
                if (this.shouldSkipDirName(entry.name)) return;
                const fullPath = path.join(normalizedDir, entry.name);
                if (entry.isDirectory()) {
                    queue.push(fullPath);
                    return;
                }

                if (!entry.isFile()) return;
                const relativePath = path.relative(skillDir, fullPath).split(path.sep).join('/');
                if (!relativePath || relativePath.startsWith('..')) return;

                try {
                    const stat = fs.statSync(fullPath);
                    const size = Number(stat.size) || 0;
                    const buffer = size > MAX_STORED_FILE_CONTENT_SIZE ? null : fs.readFileSync(fullPath);
                    const isBinary = buffer ? this.isLikelyBinary(buffer) : false;
                    const encoding = isBinary ? 'base64' : 'utf8';
                    const content =
                        !buffer ? null : isBinary ? buffer.toString('base64') : buffer.toString('utf8');

                    files.push({
                        filePath: relativePath,
                        language: this.buildFileLanguage(relativePath),
                        size,
                        isBinary,
                        encoding,
                        content,
                        updatedAt: stat.mtime,
                    });
                } catch (error) {
                    // 忽略不可读取文件，避免单文件损坏阻塞整次导入。
                }
            });

            if (files.length >= MAX_FILE_LIST_COUNT) {
                break;
            }
        }

        return files.sort((a, b) => a.filePath.localeCompare(b.filePath));
    }

    prepareSkillRecord(skillDir, repoDir, sourceMeta, category, tags) {
        const skillFilePath = path.join(skillDir, 'SKILL.md');
        const content = fs.readFileSync(skillFilePath, 'utf8');
        const stat = fs.statSync(skillFilePath);
        const frontmatter = this.parseFrontmatter(content);
        const body = frontmatter.__body || content;

        const name = String(frontmatter.name || path.basename(skillDir)).trim() || path.basename(skillDir);
        const description =
            String(frontmatter.description || this.extractDescription(body)).trim() || this.extractDescription(content);
        const allowedTools = this.parseArrayLike(
            frontmatter['allowed-tools'] || frontmatter.allowedTools || frontmatter.allowed_tools
        );

        const sourcePath = path.relative(repoDir, skillDir).split(path.sep).join('/');
        const installCommand = this.getInstallCommand({
            sourceRepo: sourceMeta.sourceRepo,
            sourceUrl: sourceMeta.sourceUrl,
            name,
        });

        const files = this.collectSkillFiles(skillDir);

        return {
            name,
            description,
            category,
            tags,
            allowedTools,
            updatedAt: stat.mtime,
            sourceRepo: sourceMeta.sourceRepo,
            sourcePath,
            skillMd: content,
            installCommand,
            files,
        };
    }

    filterSkillByName(skills, skillName) {
        const expected = String(skillName || '').trim().toLowerCase();
        if (!expected) return skills;

        return skills.filter((item) => {
            const name = String(item.name || '').trim().toLowerCase();
            const folderName = String(path.basename(item.sourcePath || '')).trim().toLowerCase();
            return name === expected || folderName === expected;
        });
    }

    async upsertSourceRecord(parsedSource, syncStatus, syncError = '') {
        const { SkillsSource } = this.app.model;
        const payload = {
            source_url: parsedSource.sourceUrl,
            source_type: parsedSource.sourceType,
            clone_url: parsedSource.cloneUrl,
            source_repo: parsedSource.sourceRepo || parsedSource.sourceUrl,
            ref: parsedSource.ref || '',
            subpath: parsedSource.subpath || '',
            repo_host: parsedSource.repoHost || '',
            repo_path: parsedSource.repoPath || '',
            sync_status: syncStatus,
            sync_error: syncError || '',
        };

        const existing = await SkillsSource.findOne({
            where: { source_url: parsedSource.sourceUrl },
        });

        if (existing) {
            await existing.update(payload);
            return existing;
        }

        return await SkillsSource.create(payload);
    }

    async importSkill(params = {}) {
        const source = String(params.source || '').trim();
        const skillName = String(params.skillName || '').trim();
        const category = this.normalizeCategory(params.category);
        const tags = this.normalizePlatformTags(params.tags);

        if (!source) {
            this.ctx.throw(400, '缺少导入来源地址');
        }

        await this.ensureStorageReady();

        let parsedSource = null;
        let sourceRecord = null;
        let tempDir = '';

        try {
            parsedSource = await this.parseImportSource(source);
            sourceRecord = await this.upsertSourceRecord(parsedSource, 'syncing');

            if (parsedSource.sourceType !== 'local') {
                tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-import-'));
                await this.cloneSourceRepo(parsedSource, tempDir);
            }

            const repoDir = parsedSource.sourceType === 'local' ? parsedSource.cloneUrl : tempDir;
            const selectedPath = this.resolveSelectedPath(repoDir, parsedSource.subpath);
            const discoveredSkillDirs = this.discoverSkillDirs(selectedPath);

            if (discoveredSkillDirs.length === 0) {
                this.ctx.throw(400, '未在来源中发现技能（SKILL.md）');
            }

            let skillRecords = discoveredSkillDirs.map((skillDir) =>
                this.prepareSkillRecord(skillDir, repoDir, parsedSource, category, tags)
            );

            skillRecords = this.filterSkillByName(skillRecords, skillName);
            if (skillRecords.length === 0) {
                this.ctx.throw(400, '未匹配到指定技能，请检查 skillName 是否正确');
            }

            const importedSkills = await this.persistSkillsForSource(sourceRecord.id, parsedSource, skillRecords);

            await sourceRecord.update({
                sync_status: 'idle',
                sync_error: '',
                last_synced_at: new Date(),
            });

            this.invalidateCache();
            await this.ensureSkillCache();

            return {
                source,
                skillName,
                category,
                tags,
                importedCount: importedSkills.length,
                refreshedCount: importedSkills.length,
                importedSkills: importedSkills.map((item) => ({
                    slug: item.slug,
                    name: item.name,
                    sourceRepo: item.sourceRepo,
                    sourcePath: item.sourcePath,
                })),
            };
        } catch (error) {
            if (sourceRecord) {
                try {
                    await sourceRecord.update({
                        sync_status: 'failed',
                        sync_error: String(error.message || error),
                    });
                } catch (updateError) {
                    this.ctx.logger.warn(`[skills] 写入同步失败状态异常: ${updateError.message}`);
                }
            }

            if (error.status && error.status >= 400 && error.status < 600) {
                throw error;
            }
            this.ctx.throw(500, `导入失败: ${error.message}`);
        } finally {
            if (tempDir && fs.existsSync(tempDir)) {
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                } catch (error) {
                    this.ctx.logger.warn(`[skills] 清理临时目录失败: ${tempDir}, ${error.message}`);
                }
            }
        }
    }

    async importSkillFile(params = {}, file) {
        const skillName = String(params.skillName || '').trim();
        const category = this.normalizeCategory(params.category);
        const tags = this.normalizePlatformTags(params.tags);
        const fileName = String((file && file.filename) || '').trim();
        const filePath = String((file && file.filepath) || '').trim();

        if (!fileName || !filePath) {
            this.ctx.throw(400, '上传文件无效');
        }
        if (!/\.skill$/i.test(fileName)) {
            this.ctx.throw(400, '仅支持上传 .skill 文件');
        }
        if (!fs.existsSync(filePath)) {
            this.ctx.throw(400, '上传文件不存在或已失效');
        }

        await this.ensureStorageReady();

        const parsedSource = this.buildUploadSourceMeta(fileName);
        let sourceRecord = null;
        let tempDir = '';

        try {
            sourceRecord = await this.upsertSourceRecord(parsedSource, 'syncing');
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-upload-'));

            try {
                const zip = new AdmZip(filePath);
                zip.extractAllTo(tempDir, true);
            } catch (error) {
                this.ctx.throw(400, `解析 .skill 文件失败: ${error.message}`);
            }

            const discoveredSkillDirs = this.discoverSkillDirs(tempDir);
            if (discoveredSkillDirs.length === 0) {
                this.ctx.throw(400, '.skill 包内未发现有效技能（缺少 SKILL.md）');
            }

            let skillRecords = discoveredSkillDirs.map((skillDir) =>
                this.prepareSkillRecord(skillDir, tempDir, parsedSource, category, tags)
            );

            skillRecords = this.filterSkillByName(skillRecords, skillName);
            if (skillRecords.length === 0) {
                this.ctx.throw(400, '未匹配到指定技能，请检查 skillName 是否正确');
            }

            const importedSkills = await this.persistSkillsForSource(
                sourceRecord.id,
                parsedSource,
                skillRecords
            );

            await sourceRecord.update({
                sync_status: 'idle',
                sync_error: '',
                last_synced_at: new Date(),
            });

            this.invalidateCache();
            await this.ensureSkillCache();

            return {
                source: parsedSource.sourceUrl,
                skillName,
                category,
                tags,
                importedCount: importedSkills.length,
                refreshedCount: importedSkills.length,
                importedSkills: importedSkills.map((item) => ({
                    slug: item.slug,
                    name: item.name,
                    sourceRepo: item.sourceRepo,
                    sourcePath: item.sourcePath,
                })),
            };
        } catch (error) {
            if (sourceRecord) {
                try {
                    await sourceRecord.update({
                        sync_status: 'failed',
                        sync_error: String(error.message || error),
                    });
                } catch (updateError) {
                    this.ctx.logger.warn(`[skills] 写入上传失败状态异常: ${updateError.message}`);
                }
            }

            if (error.status && error.status >= 400 && error.status < 600) {
                throw error;
            }
            this.ctx.throw(500, `导入失败: ${error.message}`);
        } finally {
            if (tempDir && fs.existsSync(tempDir)) {
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                } catch (error) {
                    this.ctx.logger.warn(`[skills] 清理上传解压目录失败: ${tempDir}, ${error.message}`);
                }
            }
        }
    }

    async persistSkillsForSource(sourceId, sourceMeta, skillRecords = []) {
        const { SkillsItem, SkillsFile } = this.app.model;
        const { Op } = this.app.Sequelize;
        const repoStars = await this.fetchStarsBySourceRepo(sourceMeta.sourceRepo);

        return await this.app.model.transaction(async (transaction) => {
            const oldRows = await SkillsItem.findAll({
                where: {
                    source_id: sourceId,
                    is_delete: 0,
                },
                attributes: [ 'id', 'stars' ],
                order: [ [ 'stars', 'DESC' ], [ 'id', 'DESC' ] ],
                transaction,
            });

            const fallbackStars = oldRows[0] ? Number(oldRows[0].stars) || 0 : 0;
            const resolvedStars =
                typeof repoStars === 'number' && Number.isFinite(repoStars) && repoStars >= 0
                    ? repoStars
                    : fallbackStars;

            if (oldRows.length > 0) {
                const oldIds = oldRows.map((item) => item.id);
                await SkillsFile.destroy({
                    where: {
                        skill_id: {
                            [Op.in]: oldIds,
                        },
                    },
                    transaction,
                });
            }

            await SkillsItem.destroy({
                where: {
                    source_id: sourceId,
                },
                transaction,
            });

            const usedSlugs = new Set();
            const createdSkills = [];

            for (const record of skillRecords) {
                const slug = this.buildSkillSlug(sourceMeta, record.sourcePath, record.name, usedSlugs);
                const itemRow = await SkillsItem.create(
                    {
                        source_id: sourceId,
                        slug,
                        name: record.name,
                        description: record.description,
                        category: record.category,
                        tags: JSON.stringify(record.tags || []),
                        allowed_tools: JSON.stringify(record.allowedTools || []),
                        stars: resolvedStars,
                        updated_at_remote: record.updatedAt,
                        source_repo: record.sourceRepo,
                        source_path: record.sourcePath,
                        skill_md: record.skillMd,
                        install_command: record.installCommand,
                        file_count: record.files.length,
                        is_delete: 0,
                    },
                    { transaction }
                );

                if (record.files.length > 0) {
                    const fileRows = record.files.map((fileItem) => ({
                        skill_id: itemRow.id,
                        file_path: fileItem.filePath,
                        language: fileItem.language,
                        size: fileItem.size,
                        is_binary: fileItem.isBinary ? 1 : 0,
                        encoding: fileItem.encoding,
                        content: fileItem.content,
                        updated_at_remote: fileItem.updatedAt,
                        is_delete: 0,
                    }));

                    await SkillsFile.bulkCreate(fileRows, { transaction });
                }

                createdSkills.push({
                    slug,
                    name: record.name,
                    sourceRepo: record.sourceRepo,
                    sourcePath: record.sourcePath,
                });
            }

            return createdSkills;
        });
    }

    async fetchStarsBySourceRepo(sourceRepo = '') {
        const repoFullName = this.extractGitHubRepoFullName(sourceRepo);
        if (!repoFullName) return null;
        return await this.fetchGitHubRepoStars(repoFullName);
    }

    extractGitHubRepoFullName(sourceRepo = '') {
        const raw = String(sourceRepo || '').trim();
        if (!raw) return '';
        const normalized = raw.replace(/^git\+/, '').replace(/\.git$/, '');
        const sshMatch = normalized.match(/^git@github\.com:([^/]+)\/([^/]+)$/i);
        if (sshMatch) {
            return `${sshMatch[1]}/${sshMatch[2]}`;
        }
        const httpsMatch = normalized.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i);
        if (httpsMatch) {
            return `${httpsMatch[1]}/${httpsMatch[2]}`;
        }
        return '';
    }

    parseCompactNumber(input) {
        const raw = String(input || '')
            .trim()
            .replace(/,/g, '')
            .toLowerCase();
        if (!raw) return null;

        const match = raw.match(/^(\d+(?:\.\d+)?)\s*([kmb])?$/i);
        if (!match) return null;

        const value = Number(match[1]);
        if (!Number.isFinite(value)) return null;

        const suffix = (match[2] || '').toLowerCase();
        if (!suffix) return Math.round(value);
        if (suffix === 'k') return Math.round(value * 1000);
        if (suffix === 'm') return Math.round(value * 1000 * 1000);
        if (suffix === 'b') return Math.round(value * 1000 * 1000 * 1000);
        return null;
    }

    extractStarsFromGitHubHtml(html = '') {
        const content = String(html || '');
        if (!content) return null;

        const titleMatch = content.match(/id="repo-stars-counter-star"[^>]*title="([^"]+)"/i);
        if (titleMatch) {
            const stars = this.parseCompactNumber(titleMatch[1]);
            if (typeof stars === 'number' && Number.isFinite(stars) && stars >= 0) return stars;
        }

        const ariaMatch = content.match(/id="repo-stars-counter-star"[^>]*aria-label="([^"]+)"/i);
        if (ariaMatch) {
            const numberLike = ariaMatch[1].match(/[\d,.]+\s*[kmb]?/i);
            if (numberLike) {
                const stars = this.parseCompactNumber(numberLike[0]);
                if (typeof stars === 'number' && Number.isFinite(stars) && stars >= 0) return stars;
            }
        }

        const textMatch = content.match(/id="repo-stars-counter-star"[^>]*>([^<]+)</i);
        if (textMatch) {
            const stars = this.parseCompactNumber(textMatch[1]);
            if (typeof stars === 'number' && Number.isFinite(stars) && stars >= 0) return stars;
        }

        return null;
    }

    async fetchGitHubRepoStarsFromHtml(repoFullName) {
        const url = `https://github.com/${repoFullName}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), GITHUB_API_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'doraemon-skills-market',
                    Accept: 'text/html',
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                this.ctx.logger.warn(
                    `[skills] HTML兜底获取 stars 失败: ${repoFullName}, status=${response.status}`
                );
                return null;
            }

            const html = await response.text();
            return this.extractStarsFromGitHubHtml(html);
        } catch (error) {
            this.ctx.logger.warn(`[skills] HTML兜底获取 stars 异常: ${repoFullName}, ${error.message}`);
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    async fetchGitHubRepoStars(repoFullName) {
        if (!repoFullName) return null;

        const url = `https://api.github.com/repos/${repoFullName}`;
        const headers = {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'doraemon-skills-market',
        };

        const token = this.resolveGitHubToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), GITHUB_API_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: controller.signal,
            });

            if (!response.ok) {
                this.ctx.logger.warn(
                    `[skills] 获取 GitHub stars 失败: ${repoFullName}, status=${response.status}`
                );
                if (response.status === 403 || response.status === 429) {
                    return await this.fetchGitHubRepoStarsFromHtml(repoFullName);
                }
                return null;
            }

            const data = await response.json();
            const stars = Number(data.stargazers_count);
            if (!Number.isFinite(stars) || stars < 0) return null;
            return stars;
        } catch (error) {
            this.ctx.logger.warn(`[skills] 获取 GitHub stars 异常: ${repoFullName}, ${error.message}`);
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    extractHostFromRemote(remoteUrl = '') {
        const value = String(remoteUrl || '').trim();
        if (!value) return '';
        try {
            const target = new URL(value);
            return String(target.hostname || '').toLowerCase();
        } catch (error) {
            return '';
        }
    }

    isPrivateNetworkHost(host = '') {
        const value = String(host || '').toLowerCase();
        if (!value) return false;
        if (value === 'localhost' || value.endsWith('.local')) return true;

        const ipv4Match = value.match(/^(\d{1,3})(\.\d{1,3}){3}$/);
        if (!ipv4Match) return false;

        const segments = value.split('.').map((item) => parseInt(item, 10));
        if (segments.some((item) => Number.isNaN(item) || item < 0 || item > 255)) {
            return false;
        }

        if (segments[0] === 10) return true;
        if (segments[0] === 127) return true;
        if (segments[0] === 192 && segments[1] === 168) return true;
        if (segments[0] === 172 && segments[1] >= 16 && segments[1] <= 31) return true;
        return false;
    }

    shouldBypassProxyForHost(host = '') {
        const value = String(host || '').toLowerCase();
        if (!value) return false;
        if (value.endsWith('.dtstack.cn')) return true;
        return this.isPrivateNetworkHost(value);
    }

    appendNoProxyHost(rawNoProxy = '', host = '') {
        const value = String(host || '').toLowerCase();
        if (!value) return String(rawNoProxy || '').trim();

        const entries = String(rawNoProxy || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        const set = new Set(entries);

        set.add(value);
        set.add('localhost');
        set.add('127.0.0.1');
        if (value.includes('.')) {
            const parts = value.split('.');
            if (parts.length >= 2) {
                set.add(`.${parts.slice(-2).join('.')}`);
            }
        }

        return Array.from(set).join(',');
    }

    buildCommandEnv({ remoteUrl = '' } = {}) {
        const env = { ...process.env };
        const host = this.extractHostFromRemote(remoteUrl);
        if (!host || !this.shouldBypassProxyForHost(host)) {
            return env;
        }

        [ 'http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'all_proxy', 'ALL_PROXY' ].forEach(
            (key) => {
                delete env[key];
            }
        );

        const noProxyValue = this.appendNoProxyHost(env.NO_PROXY || env.no_proxy || '', host);
        env.NO_PROXY = noProxyValue;
        env.no_proxy = noProxyValue;
        return env;
    }

    resolveGitlabToken() {
        const token = this.getSkillsConfig().gitlabToken;
        return String(token || '').trim();
    }

    resolveGitlabHostWhitelist() {
        const list = this.getSkillsConfig().gitlabHostWhitelist;
        if (!Array.isArray(list)) return [];
        return list.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
    }

    getGitAuthPrefixArgs(remoteUrl = '') {
        const host = this.extractHostFromRemote(remoteUrl);
        const whitelist = this.resolveGitlabHostWhitelist();
        if (!host || !whitelist.includes(host)) {
            return [];
        }

        const token = this.resolveGitlabToken();
        if (!token) {
            return [];
        }

        const basicToken = Buffer.from(`oauth2:${token}`).toString('base64');
        return [
            '-c',
            `http.https://${host}/.extraHeader=Authorization: Basic ${basicToken}`,
        ];
    }

    runCommand(
        command,
        args = [],
        timeout = GIT_COMMAND_TIMEOUT_MS,
        cwd = process.cwd(),
        env = process.env
    ) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd,
                env,
            });

            let stdout = '';
            let stderr = '';
            let timedOut = false;

            const timer = setTimeout(() => {
                timedOut = true;
                child.kill('SIGTERM');
            }, timeout);

            child.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });

            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });

            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });

            child.on('close', (code) => {
                clearTimeout(timer);

                if (timedOut) {
                    reject(new Error(`命令执行超时（${timeout}ms）: ${command}`));
                    return;
                }

                if (code !== 0) {
                    const detail = this.trimCommandOutput(stderr || stdout);
                    reject(new Error(detail || `命令退出码: ${code}`));
                    return;
                }

                resolve({ stdout, stderr });
            });
        });
    }

    trimCommandOutput(content = '') {
        const value = String(content || '').trim();
        if (!value) return '';
        const maxLength = 3000;
        if (value.length <= maxLength) return value;
        return value.slice(value.length - maxLength);
    }
}

module.exports = SkillsService;
