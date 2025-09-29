/**
 * 请求处理接口
 * @typedef {Object} PendingRequest
 * @property {string} internalId - 内部唯一ID
 * @property {string|number} clientId - 客户端原始ID
 * @property {function(any): void} resolve - 成功回调
 * @property {function(Error): void} reject - 失败回调
 * @property {NodeJS.Timeout} timeout - 超时定时器
 * @property {string} buffer - 缓冲区
 */

/**
 * MCP请求管理器
 * 负责管理待处理请求队列和ID映射
 */
class MCPRequestManager {
    constructor() {
        // 每个服务器的待处理请求队列（使用内部ID作为key）
        this.pendingRequests = new Map();
    }

    /**
     * 初始化服务器的请求队列
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
     * @param {string|number} clientId - 客户端ID
     * @param {function(any): void} resolve - 成功回调
     * @param {function(Error): void} reject - 失败回调
     * @param {number} [timeoutMs=30000] - 超时时间
     */
    addPendingRequest(serverId, internalId, clientId, resolve, reject, timeoutMs = 30000) {
        const requestMap = this.pendingRequests.get(serverId);
        if (!requestMap) {
            throw new Error(`服务器 ${serverId} 的请求队列未初始化`);
        }

        // 设置超时
        const timeout = setTimeout(() => {
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
            buffer: '',
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
            console.warn(`未找到待处理请求: ${internalId}`);
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

        for (const [, pendingRequest] of requestMap.entries()) {
            clearTimeout(pendingRequest.timeout);
            pendingRequest.reject(defaultError);
        }

        requestMap.clear();
    }

    /**
     * 删除服务器队列
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
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 获取服务器的待处理请求数量
     * @param {string} serverId - 服务器ID
     * @returns {number} 待处理请求数量
     */
    getPendingRequestCount(serverId) {
        const requestMap = this.pendingRequests.get(serverId);
        return requestMap ? requestMap.size : 0;
    }

    /**
     * 获取所有服务器的待处理请求统计
     * @returns {Record<string, number>} 统计信息
     */
    getAllPendingRequestStats() {
        const stats = {};
        for (const [serverId, requestMap] of this.pendingRequests.entries()) {
            stats[serverId] = requestMap.size;
        }
        return stats;
    }
}

module.exports = { MCPRequestManager };
