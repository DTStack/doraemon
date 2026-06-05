const fetch = require('node-fetch');

const DEFAULT_TIMEOUT_MS = 10 * 1000;

class GitHubStarsClient {
    constructor({ token = '', timeoutMs = DEFAULT_TIMEOUT_MS, logger = null } = {}) {
        this.token = token;
        this.timeoutMs = timeoutMs;
        this.logger = logger;
    }

    async fetchByRepoUrl(sourceRepo = '') {
        const repoFullName = this.extractGitHubRepoFullName(sourceRepo);
        if (!repoFullName) return null;
        return this.fetchGitHubRepoStars(repoFullName);
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
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

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
                if (this.logger) {
                    this.logger.warn(
                        `[github-stars] HTML兜底获取 stars 失败: ${repoFullName}, status=${response.status}`
                    );
                }
                return null;
            }

            const html = await response.text();
            return this.extractStarsFromGitHubHtml(html);
        } catch (error) {
            if (this.logger) {
                this.logger.warn(
                    `[github-stars] HTML兜底获取 stars 异常: ${repoFullName}, ${error.message}`
                );
            }
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

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: controller.signal,
            });

            if (!response.ok) {
                if (this.logger) {
                    this.logger.warn(
                        `[github-stars] 获取 GitHub stars 失败: ${repoFullName}, status=${response.status}`
                    );
                }
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
            if (this.logger) {
                this.logger.warn(
                    `[github-stars] 获取 GitHub stars 异常: ${repoFullName}, ${error.message}`
                );
            }
            return null;
        } finally {
            clearTimeout(timer);
        }
    }
}

module.exports = GitHubStarsClient;
