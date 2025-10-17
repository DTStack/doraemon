const { randomUUID } = require('crypto');

/**
 * MCP请求管理器
 * 负责管理待处理请求队列和ID映射
 */
class MCPRequestManager {
    constructor(logger) {
        this.pendingRequests = new Map();
        this.logger = logger;
    }

    /**
     * 初始化请求队列
     * @param {string} serverId - 服务器ID
     */
    initializeServerQueue(serverId) {
        if (!this.pendingRequests.has(serverId)) {
            this.pendingRequests.set(serverId, new Map());
        }
    }

    /**
     * 添加待处理请求
     * @param {string} serverId - 服务器ID
     * @param {string} internalId - 内部ID
     * @param {string} clientId - 客户端ID
     * @param {function(any): void} resolve - 成功回调
     * @param {function(Error): void} reject - 失败回调
     * @param {number} [timeoutMs=30000] - 超时时间
     */
    addPendingRequest(serverId, internalId, clientId, resolve, reject, timeoutMs = 30000) {
        const requestMap = this.pendingRequests.get(serverId);
        if (!requestMap) {
            const error = new Error(`服务器 ${serverId} 的请求队列未初始化`);
            this.logger?.error(`请求队列未初始化 [${serverId}]`);
            throw error;
        }

        // 设置超时
        const timeout = setTimeout(() => {
            this.logger?.warn(`请求超时 [${serverId}]`);
            this.removePendingRequest(serverId, internalId);
            reject(new Error(`请求超时: 客户端ID=${clientId}, 内部ID=${internalId}`));
        }, timeoutMs);

        // 创建待处理请求
        const pendingRequest = {
            internalId,
            clientId,
            resolve,
            reject,
            timeout,
            createdAt: Date.now(),
        };

        // 添加到队列（使用内部ID作为key）
        requestMap.set(internalId, pendingRequest);
    }

    /**
     * 获取待处理请求
     * @param {string} serverId - 服务器ID
     * @param {string} internalId - 内部ID
     * @returns {PendingRequest|undefined} 待处理请求
     */
    getPendingRequest(serverId, internalId) {
        const requestMap = this.pendingRequests.get(serverId);
        return requestMap?.get(internalId);
    }

    /**
     * 移除待处理请求
     * @param {string} serverId - 服务器ID
     * @param {string} internalId - 内部ID
     * @returns {boolean} 是否成功移除
     */
    removePendingRequest(serverId, internalId) {
        const requestMap = this.pendingRequests.get(serverId);
        if (!requestMap) {
            return false;
        }

        const pendingRequest = requestMap.get(internalId);
        if (pendingRequest) {
            clearTimeout(pendingRequest.timeout);
            requestMap.delete(internalId);
            return true;
        }
        return false;
    }

    /**
     * 根据内部ID查找待处理请求
     * @param {string} serverId - 服务器ID
     * @param {string} internalId - 内部ID
     * @returns {PendingRequest|null} 待处理请求
     */
    findPendingRequest(serverId, internalId) {
        const requestMap = this.pendingRequests.get(serverId);
        if (!requestMap) {
            return null;
        }

        const pendingRequest = requestMap.get(internalId);
        if (!pendingRequest) {
            return null;
        }

        return pendingRequest;
    }

    /**
     * 清理服务器的所有待处理请求
     * @param {string} serverId - 服务器ID
     * @param {Error} [error] - 错误信息
     */
    clearServerRequests(serverId, error) {
        const requestMap = this.pendingRequests.get(serverId);
        if (!requestMap) {
            return;
        }

        const defaultError = error || new Error('服务器正在停止');

        if (requestMap.size > 0) {
            this.logger?.warn(`清理待处理请求 [${serverId}]: ${requestMap.size}个`);
        }

        for (const [, pendingRequest] of requestMap.entries()) {
            clearTimeout(pendingRequest.timeout);
            pendingRequest.reject(defaultError);
        }

        requestMap.clear();
    }

    /**
     * 删除请求队列
     * @param {string} serverId - 服务器ID
     */
    deleteServerQueue(serverId) {
        this.clearServerRequests(serverId);
        this.pendingRequests.delete(serverId);
    }

    /**
     * 生成唯一的请求ID
     * @returns {string} 唯一ID
     */
    generateRequestId() {
        return randomUUID();
    }
}

module.exports = { MCPRequestManager };
