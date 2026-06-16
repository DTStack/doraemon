const Service = require('egg').Service;
const AdmZip = require('adm-zip');
const crypto = require('crypto');
const fs = require('fs');
const ignore = require('ignore');
const path = require('path');
const skillFingerprint = require('../../contracts/skill-fingerprint');

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;
const SKILL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

class SkillsRegistryService extends Service {
    // Well-Known Registry Metadata
    async getRegistryMetadata(origin) {
        return {
            apiBase: origin,
            authBase: null,
            minCliVersion: '0.9.0',
        };
    }

    // Search skills by name/description LIKE match
    async searchSkills(query, limit = 20) {
        const { SkillsItem } = this.app.model;
        const { Op } = this.app.Sequelize;
        const searchQuery = String(query || '').trim();
        const where = { is_delete: 0, parent_slug: null };

        if (searchQuery) {
            where[Op.or] = [
                { name: { [Op.like]: `%${searchQuery}%` } },
                { description: { [Op.like]: `%${searchQuery}%` } },
            ];
        }

        const skills = await SkillsItem.findAll({
            where,
            limit: Math.min(Number(limit) || 20, 100),
            order: [['stars', 'DESC']],
        });

        return skills.map((skill) => ({
            slug: skill.slug,
            displayName: skill.name,
            summary: skill.description || null,
            version: skill.version || null,
            score: 1.0,
            updatedAt: skill.updated_at ? new Date(skill.updated_at).getTime() : null,
            ownerHandle: null,
            owner: null,
        }));
    }

    // List skills with cursor pagination and sorting
    async listSkills(cursor, sort, limit = 20) {
        const { SkillsItem } = this.app.model;
        const where = { is_delete: 0, parent_slug: null };
        const sortMap = {
            newest: { key: 'newest', field: 'updated_at', type: 'date' },
            createdAt: { key: 'newest', field: 'updated_at', type: 'date' },
            updated: { key: 'newest', field: 'updated_at', type: 'date' },
            downloads: { key: 'stars', field: 'stars', type: 'number' },
            stars: { key: 'stars', field: 'stars', type: 'number' },
        };
        const sortConfig = sortMap[sort] || sortMap.newest;
        const order = [
            [sortConfig.field, 'DESC'],
            ['id', 'DESC'],
        ];
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

        if (cursor) {
            const decoded = this.decodeListCursor(cursor, sortConfig);
            if (decoded) {
                const { Op } = this.app.Sequelize;
                where[Op.or] = [
                    { [sortConfig.field]: { [Op.lt]: decoded.value } },
                    {
                        [sortConfig.field]: decoded.value,
                        id: { [Op.lt]: decoded.id },
                    },
                ];
            }
        }

        const skills = await SkillsItem.findAll({
            where,
            limit: safeLimit + 1,
            order,
        });

        const hasMore = skills.length > safeLimit;
        const items = hasMore ? skills.slice(0, -1) : skills;
        const nextCursor =
            hasMore && items.length > 0
                ? this.encodeListCursor(items[items.length - 1], sortConfig)
                : null;

        return {
            items: items.map((skill) => {
                const tags = this.parseJsonArray(skill.tags);
                const stats = { stars: skill.stars || 0, downloads: 0 };
                const item = {
                    slug: skill.slug,
                    displayName: skill.name,
                    summary: skill.description || null,
                    tags,
                    stats,
                    createdAt: skill.created_at ? new Date(skill.created_at).getTime() : null,
                    updatedAt: skill.updated_at ? new Date(skill.updated_at).getTime() : null,
                };
                if (skill.version) {
                    item.latestVersion = {
                        version: skill.version,
                        createdAt: skill.updated_at ? new Date(skill.updated_at).getTime() : null,
                        changelog: '',
                        license: null,
                    };
                }
                return item;
            }),
            nextCursor,
        };
    }

    // Get skill detail
    async _resolveSlug(slug) {
        const { SkillsItem } = this.app.model;
        let skill = await SkillsItem.findOne({
            where: { slug, is_delete: 0 },
        });

        if (!skill && this.ctx.service?.skills?.ensureSkillCache) {
            const skillCache = await this.ctx.service.skills.ensureSkillCache();
            const resolved = skillCache?.byInstallKey?.get(slug);
            if (resolved) {
                skill = await SkillsItem.findOne({
                    where: { slug: resolved.slug, is_delete: 0 },
                });
            }
        }

        return skill;
    }

    async getSkillDetail(slug) {
        const { SkillsItem } = this.app.model;
        const skill = await this._resolveSlug(slug);

        if (!skill) {
            return null;
        }

        const version = skill.version || '';
        const tags = this.parseJsonArray(skill.tags);
        const stats = { stars: skill.stars || 0, downloads: 0 };
        const createdAt = skill.created_at ? new Date(skill.created_at).getTime() : 0;
        const updatedAt = skill.updated_at ? new Date(skill.updated_at).getTime() : 0;

        const detail = {
            skill: {
                slug: skill.slug,
                displayName: skill.name,
                summary: skill.description || null,
                version,
                tags,
                stats,
                createdAt,
                updatedAt,
                isPackage: skill.is_package === 1,
                parentSlug: skill.parent_slug || null,
            },
            latestVersion: version ? {
                version,
                createdAt: updatedAt,
                changelog: '',
                license: null,
            } : null,
            owner: null,
            moderation: null,
        };

        if (skill.is_package === 1) {
            const children = await SkillsItem.findAll({
                where: { parent_slug: skill.slug, is_delete: 0 },
                order: [['stars', 'DESC']],
            });
            detail.skill.children = children.map((child) => ({
                slug: child.slug,
                displayName: child.name,
                summary: child.description || null,
                version: child.version || null,
                tags: this.parseJsonArray(child.tags),
                stats: { stars: child.stars || 0, downloads: 0 },
                createdAt: child.created_at ? new Date(child.created_at).getTime() : 0,
                updatedAt: child.updated_at ? new Date(child.updated_at).getTime() : 0,
                isPackage: false,
                parentSlug: child.parent_slug,
            }));
        }

        return detail;
    }

    // List skill versions (single version only)
    async listSkillVersions(slug) {
        const skill = await this._resolveSlug(slug);

        if (!skill) {
            return null;
        }

        const version = skill.version || '';
        const createdAt = skill.updated_at ? new Date(skill.updated_at).getTime() : 0;

        return {
            items: [
                {
                    version,
                    createdAt,
                    changelog: '',
                    changelogSource: null,
                },
            ],
            nextCursor: null,
        };
    }

    // Get skill version detail
    async getSkillVersionDetail(slug, version) {
        const skill = await this._resolveSlug(slug);

        if (!skill) {
            return null;
        }

        const currentVersion = skill.version || '';
        if (currentVersion !== version) {
            return null;
        }

        const createdAt = skill.updated_at ? new Date(skill.updated_at).getTime() : 0;

        return {
            version: {
                version: currentVersion,
                createdAt,
                changelog: '',
                changelogSource: null,
                license: null,
            },
            skill: {
                slug: skill.slug,
                displayName: skill.name,
            },
        };
    }

    // Get skill file content
    async getSkillFileContent(slug, filePath) {
        const { SkillsFile } = this.app.model;
        const skill = await this._resolveSlug(slug);

        if (!skill) {
            return null;
        }

        const targetPath = String(filePath || 'SKILL.md').trim();
        const file = await SkillsFile.findOne({
            where: { skill_id: skill.id, file_path: targetPath, is_delete: 0 },
        });

        if (!file) {
            return null;
        }

        return {
            content: file.content || '',
            isBinary: file.is_binary === 1,
            path: file.file_path,
        };
    }

    // Build skill ZIP archive in memory
    async buildSkillZip(slug) {
        const { SkillsItem, SkillsFile } = this.app.model;
        const skill = await this._resolveSlug(slug);

        if (!skill) {
            return null;
        }

        const zip = new AdmZip();

        if (skill.is_package === 1) {
            const children = await SkillsItem.findAll({
                where: { parent_slug: skill.slug, is_delete: 0 },
            });
            const sanitizeFileName = (fileName) => {
                return String(fileName || 'skill')
                    .trim()
                    .replace(/[^a-zA-Z0-9._-]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .toLowerCase();
            };
            for (const child of children) {
                const childFolder = sanitizeFileName(child.name || child.slug || 'sub-skill');
                const childFiles = await SkillsFile.findAll({
                    where: { skill_id: child.id, is_delete: 0 },
                });
                for (const file of childFiles) {
                    const content = file.content || '';
                    const zipPath = path.posix.join(slug, childFolder, file.file_path);
                    if (file.is_binary === 1) {
                        zip.addFile(zipPath, Buffer.from(content, 'base64'));
                    } else {
                        zip.addFile(zipPath, Buffer.from(content, 'utf8'));
                    }
                }
            }
        } else {
            const files = await SkillsFile.findAll({
                where: { skill_id: skill.id, is_delete: 0 },
            });
            for (const file of files) {
                const content = file.content || '';
                if (file.is_binary === 1) {
                    zip.addFile(file.file_path, Buffer.from(content, 'base64'));
                } else {
                    zip.addFile(file.file_path, Buffer.from(content, 'utf8'));
                }
            }
        }

        const version = skill.version || 'latest';
        return {
            fileName: `${slug}-${version}.zip`,
            content: zip.toBuffer(),
        };
    }

    // Validate SemVer format
    validateSemVer(version) {
        return SEMVER_PATTERN.test(String(version || '').trim());
    }

    // Publish or update a skill
    async publishSkill(payload, files) {
        const { SkillsItem, SkillsFile, SkillsSource } = this.app.model;
        const { slug, displayName, version, tags } = payload;

        if (!SKILL_SLUG_PATTERN.test(String(slug || ''))) {
            this.ctx.throw(400, 'slug 格式无效');
        }

        if (!this.validateSemVer(version)) {
            this.ctx.throw(400, 'version 必须是有效的 SemVer 格式');
        }

        const parsedTags = Array.isArray(tags) ? tags : [];

        // Read files content from disk and determine original filenames
        const processedFiles = [];
        for (const file of files) {
            const originalName = file.filename || path.basename(file.filepath);
            let content = '';
            let isBinary = false;
            try {
                if (file.filepath && fs.existsSync(file.filepath)) {
                    const buffer = fs.readFileSync(file.filepath);
                    isBinary = this.isBinaryBuffer(buffer);
                    if (isBinary) {
                        content = buffer.toString('base64');
                    } else {
                        content = buffer.toString('utf8');
                    }
                }
            } catch (err) {
                this.ctx.logger.error(`[skillsRegistry] 读取上传文件 ${originalName} 失败:`, err);
            }
            processedFiles.push({
                filename: originalName,
                content,
                isBinary,
            });
        }

        // Check for SKILL.md
        const skillMdFile = processedFiles.find(
            (f) => f.filename && f.filename.toLowerCase().endsWith('skill.md')
        );
        if (!skillMdFile) {
            const uploadedNames = processedFiles.map((f) => f.filename).join(', ');
            this.ctx.throw(400, `上传内容必须包含 SKILL.md。已上传: ${uploadedNames}`);
        }

        // Upsert skill
        let skill = await SkillsItem.findOne({ where: { slug } });

        // Create or update source record
        let source = await SkillsSource.findOne({ where: { source_url: 'clawhub-publish' } });
        if (!source) {
            source = await SkillsSource.create({
                source_url: 'clawhub-publish',
                source_type: 'upload',
                clone_url: 'clawhub-publish',
                source_repo: 'clawhub-publish',
            });
        }

        if (skill) {
            await skill.update({
                name: displayName,
                description: payload.description || '',
                version,
                tags: JSON.stringify(parsedTags),
                skill_md: skillMdFile.content || '',
                is_delete: 0,
                source_id: source.id,
            });
            // Delete old files
            await SkillsFile.update({ is_delete: 1 }, { where: { skill_id: skill.id } });
        } else {
            skill = await SkillsItem.create({
                source_id: source.id,
                slug,
                name: displayName,
                description: payload.description || '',
                version,
                tags: JSON.stringify(parsedTags),
                skill_md: skillMdFile.content || '',
                category: '通用',
                file_count: files.length,
            });
        }

        // Save files
        for (const file of processedFiles) {
            await SkillsFile.create({
                skill_id: skill.id,
                file_path: file.filename,
                language: this.detectLanguage(file.filename),
                size: Buffer.byteLength(file.content, file.isBinary ? 'base64' : 'utf8'),
                is_binary: file.isBinary ? 1 : 0,
                encoding: file.isBinary ? 'base64' : 'utf8',
                content: file.content,
            });
        }

        // Update file count
        await skill.update({ file_count: files.length });

        return {
            ok: true,
            skillId: String(skill.id),
            versionId: `v${version}`,
        };
    }

    // Compute SHA256 fingerprint for a skill
    async computeSkillFingerprint(skillId) {
        const { SkillsFile } = this.app.model;
        const files = await SkillsFile.findAll({
            where: { skill_id: skillId, is_delete: 0 },
            order: [['file_path', 'ASC']],
        });
        const fingerprintIgnore = this.createFingerprintIgnore(files);

        return skillFingerprint.buildSkillFingerprintFromStoredFiles(files, {
            ignoreMatcher: fingerprintIgnore,
        });
    }

    // Resolve fingerprint to skill
    async resolveFingerprint(slug, hash) {
        const { SkillsItem } = this.app.model;
        const skill = await SkillsItem.findOne({
            where: { slug, is_delete: 0 },
        });

        if (!skill) {
            return {
                match: null,
                latestVersion: null,
            };
        }

        const skillFingerprint = await this.computeSkillFingerprint(skill.id);
        const match = skillFingerprint === hash ? { version: skill.version || '' } : null;
        const latestVersion = skill.version ? { version: skill.version } : null;

        return {
            match,
            latestVersion,
        };
    }

    // Soft delete skill
    async deleteSkill(slug) {
        const { SkillsItem } = this.app.model;
        const skill = await SkillsItem.findOne({ where: { slug } });
        if (!skill) {
            this.ctx.throw(404, '技能不存在');
        }
        await skill.update({ is_delete: 1 });
        return { ok: true };
    }

    // Undelete skill
    async undeleteSkill(slug) {
        const { SkillsItem } = this.app.model;
        const skill = await SkillsItem.findOne({ where: { slug } });
        if (!skill) {
            this.ctx.throw(404, '技能不存在');
        }
        await skill.update({ is_delete: 0 });
        return { ok: true };
    }

    createFingerprintIgnore(files) {
        const matcher = ignore();
        for (const ignoreFileName of skillFingerprint.FINGERPRINT_IGNORE_FILENAMES) {
            const ignoreFile = files.find((file) => file.file_path === ignoreFileName);
            if (ignoreFile && ignoreFile.is_binary !== 1 && ignoreFile.content) {
                matcher.add(String(ignoreFile.content).split(/\r?\n/));
            }
        }
        return matcher;
    }

    // Utility: parse JSON array string
    parseJsonArray(value) {
        if (!value) return [];
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    encodeListCursor(skill, sortConfig) {
        const rawValue = skill[sortConfig.field];
        const value =
            sortConfig.type === 'date' ? new Date(rawValue).getTime() : Number(rawValue) || 0;
        return Buffer.from(
            JSON.stringify({
                sort: sortConfig.key,
                value,
                id: Number(skill.id),
            })
        ).toString('base64');
    }

    decodeListCursor(cursor, sortConfig) {
        try {
            const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
            if (
                parsed?.sort !== sortConfig.key ||
                !Number.isFinite(Number(parsed.value)) ||
                !Number.isFinite(Number(parsed.id))
            ) {
                return null;
            }
            return {
                value:
                    sortConfig.type === 'date'
                        ? new Date(Number(parsed.value))
                        : Number(parsed.value),
                id: Number(parsed.id),
            };
        } catch {
            return null;
        }
    }

    isBinaryBuffer(buffer) {
        if (!buffer || buffer.length === 0) return false;
        const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
        if (sample.includes(0)) return true;
        try {
            new TextDecoder('utf-8', { fatal: true }).decode(sample);
            return false;
        } catch {
            return true;
        }
    }

    // Utility: detect language from file extension
    detectLanguage(fileName) {
        const ext = (fileName || '').toLowerCase().slice(fileName.lastIndexOf('.') + 1);
        const langMap = {
            md: 'markdown',
            js: 'javascript',
            ts: 'typescript',
            json: 'json',
            yml: 'yaml',
            yaml: 'yaml',
            html: 'html',
            css: 'css',
            scss: 'scss',
            less: 'less',
            sh: 'bash',
            py: 'python',
            go: 'go',
            rs: 'rust',
            java: 'java',
        };
        return langMap[ext] || 'text';
    }
}

module.exports = SkillsRegistryService;
