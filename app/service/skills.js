const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');

const CACHE_TTL_MS = 60 * 1000;
const MAX_FILE_LIST_COUNT = 300;

class SkillsService extends Service {
    constructor(ctx) {
        super(ctx);
        this.skillCache = null;
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
            skillFiles.forEach((skillFilePath) => {
                try {
                    const skill = this.parseSkillMeta(skillFilePath, rootDir);
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

        const categories = Array.from(new Set(skills.map((item) => item.category))).sort();
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

    parseSkillMeta(skillFilePath, rootDir) {
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
        const tags = this.parseArrayLike(frontmatter.tags);
        const allowedTools = this.parseArrayLike(frontmatter['allowed-tools']);
        const stars = Number(metaJson.stars || metaJson.star || metaJson.github_stars || 0);

        const installCommand = this.getInstallCommand({
            sourceRepo: this.extractSourceRepo(packageJson),
            name,
            skillDir,
        });

        return {
            slug,
            name,
            description,
            category: this.getCategoryFromRelativePath(relativeDir),
            tags,
            allowedTools,
            stars: Number.isNaN(stars) ? 0 : stars,
            updatedAt: stat.mtime.toISOString(),
            sourceRepo: this.extractSourceRepo(packageJson),
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
        const skill = this.skillCache.skills.find((item) => item.slug === slug);
        if (!skill) {
            this.ctx.throw(404, '技能不存在');
        }

        const content = fs.readFileSync(skill.skillFilePath, 'utf8');
        const fileList = this.listSkillFiles(skill.sourcePath);

        return {
            ...skill,
            skillMd: content,
            fileList,
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
                const { _score, ...rest } = item;
                return rest;
            });

        return related;
    }
}

module.exports = SkillsService;
