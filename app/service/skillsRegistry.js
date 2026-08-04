const Service = require('egg').Service;
const AdmZip = require('adm-zip');
const fs = require('fs');
const ignore = require('ignore');
const path = require('path');
const skillUtils = require('../utils/skill-utils');
const { coerceCount, sumCounts } = require('../utils/skill-stats');
const skillFingerprint = require('../../contracts/skill-fingerprint');
const {
    SKILL_CATEGORY_OPTIONS,
    isValidSkillCategory,
} = require('../../contracts/skill-categories');

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;
const SKILL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Compatibility placeholder when client omits version; content hash is the change signal. */
const DEFAULT_PUBLISH_VERSION = '0.0.0';
/** Matches skills_items.contributor VARCHAR(50) and marketplace UI max length. */
const MAX_CONTRIBUTOR_LENGTH = 50;

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
            downloads: { key: 'downloads', field: 'downloads', type: 'number' },
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
                const stats = {
                    stars: coerceCount(skill.stars),
                    downloads: coerceCount(skill.downloads),
                };
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
        const stats = {
            stars: coerceCount(skill.stars),
            downloads: coerceCount(skill.downloads),
        };
        const createdAt = skill.created_at ? new Date(skill.created_at).getTime() : 0;
        const updatedAt = skill.updated_at ? new Date(skill.updated_at).getTime() : 0;
        let fingerprint = null;
        try {
            fingerprint = await this.computeSkillFingerprint(skill.id);
        } catch (err) {
            this.ctx.logger.warn('[skillsRegistry] compute fingerprint failed:', err);
        }

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
                category: skill.category || '通用',
                fingerprint,
            },
            // fingerprint lives only on skill (single-slot current content).
            latestVersion: version
                ? {
                      version,
                      createdAt: updatedAt,
                      changelog: '',
                      license: null,
                  }
                : null,
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
                stats: {
                    stars: coerceCount(child.stars),
                    downloads: coerceCount(child.downloads),
                },
                createdAt: child.created_at ? new Date(child.created_at).getTime() : 0,
                updatedAt: child.updated_at ? new Date(child.updated_at).getTime() : 0,
                isPackage: false,
                parentSlug: child.parent_slug,
            }));
            detail.skill.stats.downloads = sumCounts(
                detail.skill.children,
                (child) => child.stats.downloads
            );
            detail.skill.stats.stars = sumCounts(detail.skill.children, (child) => child.stats.stars);
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

        const targetPath = skillUtils.normalizeRelativePath(filePath || 'SKILL.md');
        if (!targetPath) {
            return null;
        }
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
                    const safePath = skillUtils.normalizeRelativePath(file.file_path);
                    if (!safePath) continue;
                    const zipPath = path.posix.join(slug, childFolder, safePath);
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
                const safePath = skillUtils.normalizeRelativePath(file.file_path);
                if (!safePath) continue;
                if (file.is_binary === 1) {
                    zip.addFile(safePath, Buffer.from(content, 'base64'));
                } else {
                    zip.addFile(safePath, Buffer.from(content, 'utf8'));
                }
            }
        }

        const version = skill.version || 'latest';
        return {
            slug: skill.slug,
            fileName: `${slug}-${version}.zip`,
            content: zip.toBuffer(),
        };
    }

    // Validate SemVer format
    validateSemVer(version) {
        return SEMVER_PATTERN.test(String(version || '').trim());
    }

    // Compatibility placeholder when client omits version (hash is the real change signal).
    resolvePublishVersion(version) {
        const raw = String(version || '').trim();
        if (!raw) return DEFAULT_PUBLISH_VERSION;
        if (!this.validateSemVer(raw)) {
            this.ctx.throw(400, 'version 必须是有效的 SemVer 格式');
        }
        return raw;
    }

    resolvePublishCategory(category) {
        const raw = String(category || '').trim();
        if (!raw) return null;
        if (!isValidSkillCategory(raw)) {
            this.ctx.throw(400, `category 无效，可选: ${SKILL_CATEGORY_OPTIONS.join(', ')}`);
        }
        return raw;
    }

    // Fingerprint of an in-memory multipart/processed upload set (same contract as stored files).
    computeIncomingFingerprint(processedFiles) {
        const storedLike = processedFiles.map((file) => ({
            file_path: file.relPath,
            content: file.content,
            is_binary: file.isBinary ? 1 : 0,
        }));
        const fingerprintIgnore = this.createFingerprintIgnore(storedLike);
        return skillFingerprint.buildSkillFingerprintFromStoredFiles(storedLike, {
            ignoreMatcher: fingerprintIgnore,
        });
    }

    /** Normalize multipart/in-memory uploads into stored-file shape. Requires SKILL.md. */
    normalizePublishFiles(files) {
        const processedFiles = [];
        for (const file of files) {
            const originalName = file.filename || path.basename(file.filepath || '');
            const relPath = skillUtils.normalizeRelativePath(originalName);
            if (!relPath) {
                this.ctx.throw(400, `非法文件路径: ${originalName}`);
            }

            let content = '';
            let isBinary = false;
            if (file.content != null) {
                content = String(file.content);
                isBinary = this.isBinaryBuffer(Buffer.from(content, 'utf8'));
            } else if (file.filepath && fs.existsSync(file.filepath)) {
                try {
                    const buffer = fs.readFileSync(file.filepath);
                    isBinary = this.isBinaryBuffer(buffer);
                    content = isBinary ? buffer.toString('base64') : buffer.toString('utf8');
                } catch (err) {
                    this.ctx.logger.error(
                        `[skillsRegistry] 读取上传文件 ${originalName} 失败:`,
                        err
                    );
                    this.ctx.throw(400, `读取上传文件 ${originalName} 失败`);
                }
            } else {
                this.ctx.throw(400, `上传文件不存在: ${originalName}`);
            }
            processedFiles.push({
                filename: originalName,
                relPath,
                content,
                isBinary,
            });
        }

        const skillMdFile = processedFiles.find(
            (f) => f.filename && f.filename.toLowerCase().endsWith('skill.md')
        );
        if (!skillMdFile) {
            const uploadedNames = processedFiles.map((f) => f.filename).join(', ');
            this.ctx.throw(400, `上传内容必须包含 SKILL.md。已上传: ${uploadedNames}`);
        }

        return { processedFiles, skillMdFile };
    }

    async tryPublishUnchanged(skill, incomingFingerprint, version, meta = {}, transaction) {
        if (!skill || skill.is_delete !== 0) return null;
        // Read files in the same transaction as publish so concurrent writers cannot
        // make the no-op decision against a non-transactional snapshot.
        const existingFingerprint = await this.computeSkillFingerprint(skill.id, transaction);
        if (!existingFingerprint || existingFingerprint !== incomingFingerprint) return null;
        // Content unchanged: still apply optional metadata (e.g. contributor) without re-storing files.
        if (meta.hasContributor) {
            await skill.update(
                { contributor: meta.contributor || null },
                transaction ? { transaction } : undefined
            );
        }
        return {
            ok: true,
            skillId: String(skill.id),
            versionId: `v${skill.version || version}`,
            fingerprint: existingFingerprint,
            unchanged: true,
        };
    }

    async replaceSkillStoredFiles(skill, processedFiles, transaction) {
        const { SkillsFile } = this.app.model;
        await SkillsFile.update({ is_delete: 1 }, { where: { skill_id: skill.id }, transaction });
        for (const file of processedFiles) {
            await SkillsFile.create(
                {
                    skill_id: skill.id,
                    file_path: file.relPath,
                    language: this.detectLanguage(file.filename),
                    size: Buffer.byteLength(file.content, file.isBinary ? 'base64' : 'utf8'),
                    is_binary: file.isBinary ? 1 : 0,
                    encoding: file.isBinary ? 'base64' : 'utf8',
                    content: file.content,
                },
                { transaction }
            );
        }
        await skill.update({ file_count: processedFiles.length }, { transaction });
    }

    validateContributor(value) {
        const contributor = String(value || '').trim();
        if (contributor.length > MAX_CONTRIBUTOR_LENGTH) {
            this.ctx.throw(400, `贡献者不能超过 ${MAX_CONTRIBUTOR_LENGTH} 个字符`);
        }
        return contributor;
    }

    // Publish or update a skill (single-slot per slug; content hash is the change signal)
    async publishSkill(payload, files) {
        const { SkillsItem, SkillsSource } = this.app.model;
        const { slug, displayName, tags } = payload;
        const version = this.resolvePublishVersion(payload.version);
        const category = this.resolvePublishCategory(payload.category);
        const hasContributor = Object.prototype.hasOwnProperty.call(payload, 'contributor');
        const contributor = hasContributor ? this.validateContributor(payload.contributor) : '';

        if (!SKILL_SLUG_PATTERN.test(String(slug || ''))) {
            this.ctx.throw(400, 'slug 格式无效');
        }

        const parsedTags = Array.isArray(tags) ? tags : [];
        const { processedFiles, skillMdFile } = this.normalizePublishFiles(files);
        const incomingFingerprint = this.computeIncomingFingerprint(processedFiles);

        return await this.app.model.transaction(async (t) => {
            const [source] = await SkillsSource.findOrCreate({
                where: { source_url: 'clawhub-publish' },
                defaults: {
                    source_type: 'upload',
                    clone_url: 'clawhub-publish',
                    source_repo: 'clawhub-publish',
                },
                transaction: t,
            });

            let skill = await SkillsItem.findOne({ where: { slug }, transaction: t });

            const noop = await this.tryPublishUnchanged(
                skill,
                incomingFingerprint,
                version,
                {
                    hasContributor,
                    contributor,
                },
                t
            );
            if (noop) return noop;

            if (skill) {
                const updatePayload = {
                    name: displayName,
                    description: payload.description || '',
                    version,
                    tags: JSON.stringify(parsedTags),
                    skill_md: skillMdFile.content || '',
                    is_delete: 0,
                    source_id: source.id,
                };
                // Explicit preserve: do not rely on partial-update omitting the field.
                if (category) {
                    updatePayload.category = category;
                } else if (skill.category) {
                    updatePayload.category = skill.category;
                }
                if (hasContributor) {
                    updatePayload.contributor = contributor || null;
                }
                await skill.update(updatePayload, { transaction: t });
            } else {
                const createPayload = {
                    source_id: source.id,
                    slug,
                    name: displayName,
                    description: payload.description || '',
                    version,
                    tags: JSON.stringify(parsedTags),
                    skill_md: skillMdFile.content || '',
                    category: category || '通用',
                    file_count: processedFiles.length,
                };
                if (hasContributor) {
                    createPayload.contributor = contributor || null;
                }
                skill = await SkillsItem.create(createPayload, { transaction: t });
            }

            await this.replaceSkillStoredFiles(skill, processedFiles, t);

            return {
                ok: true,
                skillId: String(skill.id),
                versionId: `v${version}`,
                fingerprint: incomingFingerprint,
                unchanged: false,
            };
        });
    }

    // Compute SHA256 fingerprint for a skill
    async computeSkillFingerprint(skillId, transaction) {
        const { SkillsFile } = this.app.model;
        const query = {
            where: { skill_id: skillId, is_delete: 0 },
            order: [['file_path', 'ASC']],
        };
        if (transaction) {
            query.transaction = transaction;
        }
        const files = await SkillsFile.findAll(query);
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

        const currentFingerprint = await this.computeSkillFingerprint(skill.id);
        const version = skill.version || '0.0.0';
        const match =
            hash && currentFingerprint === hash
                ? { version, fingerprint: currentFingerprint }
                : null;
        const latestVersion = {
            version,
            fingerprint: currentFingerprint,
        };

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
            sortConfig.type === 'date' ? new Date(rawValue).getTime() : coerceCount(rawValue);
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
            new TextDecoder('utf-8', { fatal: true }).decode(buffer);
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
