const { randomUUID } = require('crypto');

/**
 * MCP会话管理器
 */
class MCPSessionManager {
    constructor() {
        this.sessions = new Map();
        this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟超时

        // 定期清理过期会话
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 5 * 60 * 1000); // 每5分钟检查一次
    }

    createSession(serverId, protocolVersion = '2025-06-18') {
        const sessionId = randomUUID();
        const session = {
            id: sessionId,
            serverId,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            protocolVersion,
        };

        this.sessions.set(sessionId, session);
        console.log(`创建MCP会话: ${sessionId} for server: ${serverId}`);

        return session;
    }

    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }

        // 检查是否过期
        if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT) {
            this.sessions.delete(sessionId);
            console.log(`会话已过期: ${sessionId}`);
            return null;
        }

        // 更新最后活动时间
        session.lastActivity = Date.now();
        return session;
    }

    updateSessionActivity(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = Date.now();
            return true;
        }
        return false;
    }

    deleteSession(sessionId) {
        const deleted = this.sessions.delete(sessionId);
        if (deleted) {
            console.log(`删除MCP会话: ${sessionId}`);
        }
        return deleted;
    }

    updateSessionId(oldSessionId, newSessionId) {
        const session = this.sessions.get(oldSessionId);
        if (session) {
            session.id = newSessionId;
            this.sessions.delete(oldSessionId);
            this.sessions.set(newSessionId, session);
            console.log(`更新会话ID: ${oldSessionId} -> ${newSessionId}`);
            return true;
        }
        return false;
    }

    getSessionsByServerId(serverId) {
        return Array.from(this.sessions.values()).filter(
            (session) => session.serverId === serverId
        );
    }

    cleanupExpiredSessions() {
        const now = Date.now();
        const expiredSessions = [];

        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > this.SESSION_TIMEOUT) {
                expiredSessions.push(sessionId);
            }
        }

        expiredSessions.forEach((sessionId) => {
            this.sessions.delete(sessionId);
            console.log(`清理过期会话: ${sessionId}`);
        });

        if (expiredSessions.length > 0) {
            console.log(`清理了 ${expiredSessions.length} 个过期会话`);
        }
    }

    getSessionStats() {
        const totalSessions = this.sessions.size;
        const sessionsByServer = {};
        let oldestSession = null;

        for (const session of this.sessions.values()) {
            sessionsByServer[session.serverId] = (sessionsByServer[session.serverId] || 0) + 1;

            if (oldestSession === null || session.createdAt < oldestSession) {
                oldestSession = session.createdAt;
            }
        }

        return {
            totalSessions,
            sessionsByServer,
            oldestSession,
        };
    }

    static isValidProtocolVersion(version) {
        const supportedVersions = ['2025-06-18', '2025-03-26', '2024-11-05'];
        return supportedVersions.includes(version);
    }

    static generateSecureSessionId() {
        return randomUUID();
    }
}

module.exports = { MCPSessionManager };
