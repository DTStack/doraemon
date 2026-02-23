const Service = require('egg').Service;
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const CACHE_TTL_MS = 60 * 1000;
const MAX_FILE_LIST_COUNT = 300;
const MAX_FILE_CONTENT_SIZE = 2 * 1024 * 1024;
const IMPORT_TIMEOUT_MS = 60 * 1000;
const GITHUB_API_TIMEOUT_MS = 10 * 1000;
const MAX_PLATFORM_TAGS = 5;
const MAX_TAG_LENGTH = 20;
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
        this.skillSourceCache = {};
    }

    getSkillCategoryOptions() {
        return [ ...SKILL_CATEGORY_OPTIONS ];
    }

    getSkillRootDirs() {
        const homeDir = process.env.HOME || '';
        const codexHome = process.env.CODEX_HOME || path.join(homeDir, '.codex');
        const agentHome = path.join(homeDir, '.agents');
        return [path.join(codexHome, 'skills'), path.join(agentHome, 'skills')];
    }

    isCacheValid() {
        return (
            this.skillCache &&
            this.skillCache.loadedAt &&
            Date.now() - this.skillCache.loadedAt < CACHE_TTL_MS
        );
    }

    async ensureSkillCache() {
        if (this.isCacheValid()) return this.skillCache;

        const rootDirs = this.getSkillRootDirs();
        const skills = [];

        rootDirs.forEach((rootDir) => {
            if (!fs.existsSync(rootDir)) return;
            const skillFiles = this.findSkillFiles(rootDir);
            const sourceMap = this.getSkillSourceMapByRoot(rootDir);
            skillFiles.forEach((skillFilePath) => {
                try {
                    const skill = this.parseSkillMeta(skillFilePath, rootDir, sourceMap);
                    if (skill) {
                        skills.push(skill);
                    }
                } catch (error) {
                    this.ctx.logger.warn(
                        `[skills] 解析技能失败: ${skillFilePath}, ${error.message}`
                    );
                }
            });
        });

        const categories = this.getSkillCategoryOptions();
        this.skillCache = {
            loadedAt: Date.now(),
            skills,
            categories,
        };
        return this.skillCache;
    }

    findSkillFiles(rootDir) {
        const result = [];
        const stack = [rootDir];

        while (stack.length > 0) {
            const currentDir = stack.pop();
            let entries = [];
            try {
                entries = fs.readdirSync(currentDir, { withFileTypes: true });
            } catch (error) {
                continue;
            }

            entries.forEach((entry) => {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name === 'node_modules' || entry.name === '.git') return;
                    stack.push(fullPath);
                    return;
                }
                if (entry.isFile() && entry.name === 'SKILL.md') {
                    result.push(fullPath);
                }
            });
        }

        return result;
    }

    parseSkillMeta(skillFilePath, rootDir, sourceMap = {}) {
        const content = fs.readFileSync(skillFilePath, 'utf8');
        const stat = fs.statSync(skillFilePath);
        const skillDir = path.dirname(skillFilePath);
        const relativeDir = path.relative(rootDir, skillDir);
        const slug = relativeDir.split(path.sep).join('-').toLowerCase();
        const frontmatter = this.parseFrontmatter(content);

        const packageJsonPath = path.join(skillDir, 'package.json');
        let packageJson = {};
        if (fs.existsSync(packageJsonPath)) {
            try {
                packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            } catch (error) {
                packageJson = {};
            }
        }

        const metaJsonPath = path.join(skillDir, '_meta.json');
        let metaJson = {};
        if (fs.existsSync(metaJsonPath)) {
            try {
                metaJson = JSON.parse(fs.readFileSync(metaJsonPath, 'utf8'));
            } catch (error) {
                metaJson = {};
            }
        }

        const name = frontmatter.name || path.basename(skillDir);
        const description = frontmatter.description || this.extractDescription(content);
        const categoryByPath = this.getCategoryFromRelativePath(relativeDir);
        const category = this.normalizeCategory(metaJson.category || categoryByPath);
        const tags = this.normalizePlatformTags(metaJson.platformTags || metaJson.tags);
        const allowedTools = this.parseArrayLike(frontmatter['allowed-tools']);
        const stars = Number(metaJson.stars || metaJson.star || metaJson.github_stars || 0);
        const skillDirName = path.basename(skillDir);
        const sourceRepo =
            this.extractSourceRepo(packageJson) ||
            String(metaJson.sourceRepo || '').trim() ||
            String(sourceMap[skillDirName] || sourceMap[name] || '').trim();

        const installCommand = this.getInstallCommand({
            sourceRepo,
            name,
            skillDir,
        });

        return {
            slug,
            name,
            description,
            category,
            tags,
            allowedTools,
            stars: Number.isNaN(stars) ? 0 : stars,
            updatedAt: stat.mtime.toISOString(),
            sourceRepo,
            sourcePath: skillDir,
            skillFilePath,
            installCommand,
        };
    }

    parseFrontmatter(content) {
        const result = {};
        if (!content.startsWith('---')) return result;
        const endIndex = content.indexOf('\n---', 3);
        if (endIndex === -1) return result;

        const frontmatterText = content.slice(3, endIndex).trim();
        const lines = frontmatterText.split('\n');
        lines.forEach((line) => {
            const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
            if (!match) return;
            const key = match[1];
            let value = match[2].trim();
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            result[key] = value;
        });
        return result;
    }

    extractDescription(content) {
        const stripped = content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#') && !line.startsWith('---'));
        return stripped[0] || '';
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

    getCategoryFromRelativePath(relativeDir) {
        const parts = relativeDir.split(path.sep).filter(Boolean);
        if (parts.length === 0) return '未分类';
        if (parts.length === 1) return '通用';
        return parts[0];
    }

    normalizeCategory(rawCategory) {
        const category = String(rawCategory || '').trim();
        if (!category) return '通用';
        if (SKILL_CATEGORY_OPTIONS.includes(category)) {
            return category;
        }
        return '其他';
    }

    normalizePlatformTags(rawTags) {
        const values = this.parseArrayLike(rawTags)
            .map((item) => String(item || '').trim())
            .map((item) => item.replace(/\s+/g, ' '))
            .filter(Boolean)
            .map((item) => item.slice(0, MAX_TAG_LENGTH));
        return Array.from(new Set(values)).slice(0, MAX_PLATFORM_TAGS);
    }

    extractSourceRepo(packageJson = {}) {
        if (!packageJson.repository) return '';
        if (typeof packageJson.repository === 'string') return packageJson.repository;
        return packageJson.repository.url || '';
    }

    getInstallCommand({ sourceRepo, name, skillDir }) {
        if (sourceRepo) {
            return `npx skills add ${sourceRepo} --skill "${name}"`;
        }
        return `mkdir -p "$CODEX_HOME/skills" && cp -R "${skillDir}" "$CODEX_HOME/skills/${name}"`;
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
        let list = [...skills];

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
        const pageList = list.slice(offset, offset + safePageSize);

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

    async getSkillDetail(slug) {
        await this.ensureSkillCache();
        const skill = this.getSkillBySlug(slug);

        const content = fs.readFileSync(skill.skillFilePath, 'utf8');
        const fileList = this.listSkillFiles(skill.sourcePath);

        return {
            ...skill,
            skillMd: content,
            fileList,
        };
    }

    async getSkillFileContent(slug, filePath) {
        await this.ensureSkillCache();
        const skill = this.getSkillBySlug(slug);
        const normalizedPath = this.normalizeRelativePath(filePath);
        const rootPath = path.resolve(skill.sourcePath);
        const targetPath = path.resolve(rootPath, normalizedPath);

        if (!this.isPathInsideRoot(rootPath, targetPath)) {
            this.ctx.throw(400, '非法文件路径');
        }

        if (!fs.existsSync(targetPath)) {
            this.ctx.throw(404, '文件不存在');
        }

        const stat = fs.statSync(targetPath);
        if (!stat.isFile()) {
            this.ctx.throw(400, '仅支持读取文件内容');
        }

        if (stat.size > MAX_FILE_CONTENT_SIZE) {
            this.ctx.throw(413, '文件过大，无法在线预览');
        }

        const fileBuffer = fs.readFileSync(targetPath);
        const isBinary = this.isLikelyBinary(fileBuffer);
        const extension = path.extname(normalizedPath).toLowerCase();

        return {
            slug: skill.slug,
            path: normalizedPath,
            language: EXTENSION_LANGUAGE_MAP[extension] || 'text',
            size: stat.size,
            readonly: true,
            isBinary,
            encoding: isBinary ? 'base64' : 'utf8',
            content: isBinary ? fileBuffer.toString('base64') : fileBuffer.toString('utf8'),
        };
    }

    async getSkillArchive(slug) {
        await this.ensureSkillCache();
        const skill = this.getSkillBySlug(slug);
        const files = this.collectSkillFiles(skill.sourcePath);
        const zip = new AdmZip();
        const rootFolder = this.sanitizeFileName(skill.name || skill.slug || 'skill');

        files.forEach((relativePath) => {
            const absolutePath = path.resolve(skill.sourcePath, relativePath);
            const content = fs.readFileSync(absolutePath);
            zip.addFile(path.posix.join(rootFolder, relativePath), content);
        });

        return {
            fileName: `${rootFolder}.zip`,
            content: zip.toBuffer(),
        };
    }

    listSkillFiles(skillDir) {
        const files = [];
        const stack = [skillDir];
        while (stack.length > 0) {
            const currentDir = stack.pop();
            let entries = [];
            try {
                entries = fs.readdirSync(currentDir, { withFileTypes: true });
            } catch (error) {
                continue;
            }

            entries.forEach((entry) => {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    stack.push(fullPath);
                    return;
                }
                if (!entry.isFile()) return;
                const relativePath = path.relative(skillDir, fullPath).split(path.sep).join('/');
                files.push(relativePath);
            });

            if (files.length >= MAX_FILE_LIST_COUNT) break;
        }

        return files.sort();
    }

    collectSkillFiles(skillDir, maxCount = 2000) {
        const files = [];
        const stack = [skillDir];
        while (stack.length > 0) {
            const currentDir = stack.pop();
            let entries = [];
            try {
                entries = fs.readdirSync(currentDir, { withFileTypes: true });
            } catch (error) {
                continue;
            }

            entries.forEach((entry) => {
                if (entry.name === '.git' || entry.name === 'node_modules') return;
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    stack.push(fullPath);
                    return;
                }
                if (!entry.isFile()) return;
                files.push(path.relative(skillDir, fullPath).split(path.sep).join('/'));
            });

            if (files.length >= maxCount) break;
        }

        return files.sort();
    }

    getSkillBySlug(slug) {
        const skill = this.skillCache.skills.find((item) => item.slug === slug);
        if (!skill) {
            this.ctx.throw(404, '技能不存在');
        }
        return skill;
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

    isPathInsideRoot(rootPath, targetPath) {
        if (targetPath === rootPath) return false;
        return targetPath.startsWith(`${rootPath}${path.sep}`);
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

    async getRelatedSkills(slug, limit = 6) {
        await this.ensureSkillCache();
        const target = this.skillCache.skills.find((item) => item.slug === slug);
        if (!target) {
            this.ctx.throw(404, '技能不存在');
        }

        const targetTags = new Set((target.tags || []).map((item) => item.toLowerCase()));
        const related = this.skillCache.skills
            .filter((item) => item.slug !== slug)
            .map((item) => {
                const itemTags = (item.tags || []).map((tag) => tag.toLowerCase());
                const overlap = itemTags.filter((tag) => targetTags.has(tag)).length;
                const categoryScore = item.category === target.category ? 3 : 0;
                const score = overlap * 10 + categoryScore + Math.min(item.stars, 10);
                return { ...item, _score: score };
            })
            .filter((item) => item._score > 0)
            .sort((a, b) => b._score - a._score || b.stars - a.stars)
            .slice(0, parseInt(limit, 10) || 6)
            .map((item) => {
                const rest = { ...item };
                delete rest._score;
                return rest;
            });

        return related;
    }

    async importSkill(params = {}) {
        const source = String(params.source || '').trim();
        const skillName = String(params.skillName || '').trim();
        const category = this.normalizeCategory(params.category);
        const tags = this.normalizePlatformTags(params.tags);
        const sourceRepoFallback = this.extractSourceRepoFromImportSource(source);
        if (!source) {
            this.ctx.throw(400, '缺少导入来源地址');
        }

        await this.ensureSkillCache();
        const beforeSlugs = new Set(this.skillCache.skills.map((item) => item.slug));
        const args = [ '-y', 'skills@latest', 'add', source, '-g', '--agent', 'codex', '--copy', '--yes' ];
        if (skillName) {
            args.push('--skill', skillName);
        } else {
            // 未指定 skillName 时显式导入源中的全部 skills，避免依赖 CLI 默认选择行为
            args.push('--skill', '*');
        }

        let commandResult = null;
        try {
            commandResult = await this.runCommand('npx', args, IMPORT_TIMEOUT_MS);
        } catch (error) {
            this.ctx.throw(500, `导入失败: ${error.message}`);
        }

        this.skillCache = null;
        this.skillSourceCache = {};
        await this.ensureSkillCache();
        const importedSkills = this.skillCache.skills
            .filter((item) => !beforeSlugs.has(item.slug))
            .map((item) => ({
                slug: item.slug,
                name: item.name,
                sourceRepo: item.sourceRepo || sourceRepoFallback,
                sourcePath: item.sourcePath,
            }));

        if (importedSkills.length > 0) {
            const starsBySlug = await this.fetchStarsForImportedSkills(importedSkills);
            this.persistSkillMeta(importedSkills, {
                category,
                tags,
                starsBySlug,
            });
            this.skillCache = null;
            this.skillSourceCache = {};
            await this.ensureSkillCache();
        }

        return {
            source,
            skillName,
            category,
            tags,
            importedCount: importedSkills.length,
            importedSkills,
            command: `npx ${args.join(' ')}`,
            logs: {
                stdout: this.trimCommandOutput(commandResult.stdout),
                stderr: this.trimCommandOutput(commandResult.stderr),
            },
        };
    }

    persistSkillMeta(skills = [], meta = {}) {
        const nextCategory = this.normalizeCategory(meta.category);
        const nextTags = this.normalizePlatformTags(meta.tags);
        const starsBySlug = meta.starsBySlug || {};
        skills.forEach((item) => {
            const skillDir = item.sourcePath;
            if (!skillDir || !fs.existsSync(skillDir)) return;
            const metaFilePath = path.join(skillDir, '_meta.json');
            let currentMeta = {};
            if (fs.existsSync(metaFilePath)) {
                try {
                    currentMeta = JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
                } catch (error) {
                    currentMeta = {};
                }
            }

            const nextMeta = {
                ...currentMeta,
                category: nextCategory,
                platformTags: nextTags,
                tags: nextTags,
            };
            const stars = starsBySlug[item.slug];
            if (typeof stars === 'number' && Number.isFinite(stars) && stars >= 0) {
                nextMeta.stars = stars;
                nextMeta['github_stars'] = stars;
                nextMeta.starsFetchedAt = new Date().toISOString();
            }
            fs.writeFileSync(metaFilePath, `${JSON.stringify(nextMeta, null, 2)}\n`, 'utf8');
        });
    }

    async fetchStarsForImportedSkills(skills = []) {
        const repoToStars = {};
        const uniqueRepos = Array.from(
            new Set(
                skills
                    .map((item) => this.extractGitHubRepoFullName(item.sourceRepo))
                    .filter(Boolean)
            )
        );

        for (const repoFullName of uniqueRepos) {
            // 顺序请求，减少被限流概率；一次导入通常仓库数很少
            const stars = await this.fetchGitHubRepoStars(repoFullName);
            if (typeof stars === 'number' && Number.isFinite(stars) && stars >= 0) {
                repoToStars[repoFullName] = stars;
            }
        }

        const starsBySlug = {};
        skills.forEach((item) => {
            const repoFullName = this.extractGitHubRepoFullName(item.sourceRepo);
            if (!repoFullName) return;
            const stars = repoToStars[repoFullName];
            if (typeof stars === 'number') {
                starsBySlug[item.slug] = stars;
            }
        });

        return starsBySlug;
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

    async fetchGitHubRepoStars(repoFullName) {
        if (!repoFullName) return null;
        const url = `https://api.github.com/repos/${repoFullName}`;
        const headers = {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'doraemon-skills-market',
        };
        const token = String(process.env.GITHUB_TOKEN || '').trim();
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
                return null;
            }
            const data = await response.json();
            const stars = Number(data.stargazers_count);
            if (Number.isNaN(stars) || stars < 0) return null;
            return stars;
        } catch (error) {
            this.ctx.logger.warn(
                `[skills] 获取 GitHub stars 异常: ${repoFullName}, ${error.message}`
            );
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    extractSourceRepoFromImportSource(source = '') {
        const raw = String(source || '').trim();
        if (!raw) return '';

        // 支持 GitHub tree URL：/owner/repo/tree/branch/path
        const treeMatch = raw.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/[^/]+\/?.*$/i);
        if (treeMatch) {
            return `https://github.com/${treeMatch[1]}/${treeMatch[2]}.git`;
        }

        const repoMatch = raw.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i);
        if (repoMatch) {
            return `https://github.com/${repoMatch[1]}/${repoMatch[2].replace(/\.git$/i, '')}.git`;
        }

        return '';
    }

    runCommand(command, args = [], timeout = IMPORT_TIMEOUT_MS) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd: process.cwd(),
                env: process.env,
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
                    reject(new Error(`导入命令执行超时（${timeout}ms）`));
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

    getSkillSourceMapByRoot(rootDir) {
        if (this.skillSourceCache[rootDir]) {
            return this.skillSourceCache[rootDir];
        }

        const sourceMap = {};
        const parentDir = path.dirname(rootDir);
        const lockFilePath = path.join(parentDir, '.skill-lock.json');
        if (fs.existsSync(lockFilePath)) {
            try {
                const lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
                const skills = lockData && lockData.skills ? lockData.skills : {};
                Object.keys(skills).forEach((skillName) => {
                    const sourceUrl = skills[skillName] && skills[skillName].sourceUrl;
                    if (sourceUrl) {
                        sourceMap[skillName] = String(sourceUrl);
                    }
                });
            } catch (error) {
                this.ctx.logger.warn(`[skills] 读取锁文件失败: ${lockFilePath}, ${error.message}`);
            }
        }

        this.skillSourceCache[rootDir] = sourceMap;
        return sourceMap;
    }
}

module.exports = SkillsService;
