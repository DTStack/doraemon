const Service = require('egg').Service;
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const tar = require('tar');
const env = require('../../env.json');
const { MCPClient } = require('../mcp/mcpClient');
const { convertKeysToSnakeCase, buildMCPConfig } = require('../utils');

class MCPService extends Service {
    /**
     * 获取MCP服务器列表
     * @param {Object} params - 查询参数
     * @param {Number} params.pageNum - 页码
     * @param {Number} params.pageSize - 每页数量
     * @param {String} params.transport - 传输类型
     * @param {String} params.author - 作者
     * @param {Array} params.tags - 标签数组
     * @param {String} params.keyword - 搜索关键词
     * @param {Boolean} params.showAll - 是否显示所有服务器
     */
    async getMCPServerList(params = {}) {
        const {
            pageNum = 1,
            pageSize = 20,
            transport,
            author,
            tags,
            keyword,
            showAll = false,
        } = params;
        const offset = (pageNum - 1) * pageSize;

        const where = {
            is_delete: 0,
        };

        if (!showAll) {
            where.status = {
                [this.app.Sequelize.Op.not]: 'stopped',
            };
        }

        if (transport) {
            where.transport = transport;
        }

        if (author) {
            where.author = {
                [this.app.Sequelize.Op.like]: `%${author}%`,
            };
        }

        if (keyword) {
            where[this.app.Sequelize.Op.or] = [
                { server_id: { [this.app.Sequelize.Op.like]: `%${keyword}%` } },
                { title: { [this.app.Sequelize.Op.like]: `%${keyword}%` } },
                { description: { [this.app.Sequelize.Op.like]: `%${keyword}%` } },
            ];
        }

        if (tags && tags.length > 0) {
            where[this.app.Sequelize.Op.and] = tags.map((tag) =>
                this.app.Sequelize.literal(`JSON_CONTAINS(tags, '"${tag}"')`)
            );
        }

        const result = await this.ctx.model.McpServer.findAndCountAll({
            where,
            limit: parseInt(pageSize),
            offset,
            order: [['created_at', 'DESC']],
            attributes: {
                // 列表中不返回敏感的环境变量信息
                exclude: ['env'],
            },
        });

        return {
            list: result.rows,
            total: result.count,
            pageNum: parseInt(pageNum),
            pageSize: parseInt(pageSize),
        };
    }

    /**
     * 根据服务器ID获取详情
     * @param {String} serverId - 服务器ID
     */
    async getMCPServerDetail(serverId) {
        const server = await this.findByServerId(serverId);
        if (!server) {
            this.ctx.throw(400, 'MCP服务器不存在');
        }
        return server;
    }

    /**
     * 注册MCP服务器
     * @param {Object} data - 服务器数据
     */
    async registerMCPServer(data) {
        const {
            serverId,
            title,
            description,
            shortDescription,
            author,
            version,
            tags,
            transport,
            command,
            args,
            env,
            httpUrl,
            sseUrl,
            gitUrl,
            files,
        } = data;

        // 检查名称是否已存在
        const existingServer = await this.ctx.model.McpServer.findOne({
            where: {
                server_id: serverId,
                is_delete: 0,
            },
        });

        if (existingServer) {
            this.ctx.throw(400, 'MCP服务器名称已存在');
        }

        // 处理文件上传
        let filePath = null;
        let deployPath = null;

        if (transport === 'stdio') {
            deployPath = this.generateDeployPath(serverId);

            this.ctx.logger.info(
                `MCP服务注册 - transport: ${transport}, files数量: ${files ? files.length : 0}`
            );

            if (files && files.length > 0) {
                this.ctx.logger.info(`开始处理文件上传，文件信息:`, {
                    filename: files[0].filename || files[0].originalFilename || 'unknown',
                    filepath: files[0].filepath || files[0].path || 'unknown',
                    size: files[0].size || 'unknown',
                });

                filePath = await this.handleFileUpload(files[0], serverId);

                // 文件解压完成后清理临时文件
                setTimeout(() => {
                    this.cleanupFile(filePath);
                }, 5000); // 5秒后清理临时文件
            } else {
                this.ctx.logger.info('MCP服务注册 - 没有文件需要处理');
            }
        }

        // 处理环境变量
        let parsedEnv = null;
        if (env && Array.isArray(env)) {
            parsedEnv = {};
            env.forEach((item) => {
                if (item.key && item.value) {
                    parsedEnv[item.key] = item.value;
                }
            });
        }

        // 创建服务器记录
        const serverData = {
            server_id: serverId,
            title,
            description,
            short_description: shortDescription,
            author,
            version,
            tags: Array.isArray(tags) ? tags : [],
            transport,
            git_url: gitUrl,
            deploy_path: deployPath,
        };

        // 根据传输类型设置特定字段
        if (transport === 'stdio') {
            serverData.command = command;
            serverData.args = args;
            serverData.env = parsedEnv;
        } else if (transport === 'streamable-http') {
            serverData.http_url = httpUrl;
        } else if (transport === 'sse') {
            serverData.sse_url = sseUrl;
        }

        const server = await this.ctx.model.McpServer.create(serverData);

        try {
            await this.startMCPServer(server.server_id);
            this.ctx.logger.info(`MCP服务器注册成功并已启动: ${server.server_id}`);

            // 启动成功后，自动获取服务器信息
            setTimeout(async () => {
                try {
                    await this.syncMCPServerInfo(server.server_id);
                    this.ctx.logger.info(`MCP服务器信息同步完成: ${server.server_id}`);
                } catch (syncError) {
                    this.ctx.logger.error(
                        `MCP服务器信息同步失败 [${server.server_id}]:`,
                        syncError.message
                    );
                }
            }, 2000); // 等待2秒后同步，确保服务器已完全启动
        } catch (error) {
            this.ctx.logger.error(
                `MCP服务器注册成功但启动失败 [${server.server_id}]:`,
                error.message
            );
        }

        return server;
    }

    /**
     * 更新MCP服务器
     * @param {String} serverId - 服务器ID
     * @param {Object} data - 更新数据
     */
    async updateMCPServer(serverId, data) {
        const server = await this.findByServerId(serverId);
        if (!server) {
            this.ctx.throw(404, 'MCP服务器不存在');
        }

        const { files, ...updateData } = data;
        let needsRestart = false; // 标记是否需要重启服务器

        // 处理文件上传（仅对stdio类型且有文件的情况）
        let filePath = null;
        const deployPath = server.deploy_path;

        if (server.transport === 'stdio' && files && files.length > 0) {
            this.ctx.logger.info(
                `MCP服务更新 - transport: ${server.transport}, files数量: ${files.length}`
            );

            // 如果服务器正在运行，先停止它
            if (server.status === 'running') {
                try {
                    await this.stopMCPServer(server.server_id);
                    this.ctx.logger.info(`MCP服务器更新前已停止: ${server.server_id}`);
                    needsRestart = true; // 标记需要重启
                } catch (error) {
                    this.ctx.logger.error(
                        `MCP服务器更新前停止失败 [${server.server_id}]:`,
                        error.message
                    );
                }
            }

            // 清理旧的部署目录
            if (deployPath && fs.existsSync(deployPath)) {
                try {
                    fs.rmSync(deployPath, { recursive: true, force: true });
                    this.ctx.logger.info(`旧部署目录已清理: ${deployPath}`);
                } catch (error) {
                    this.ctx.logger.error(`清理旧部署目录失败: ${deployPath}`, error);
                }
            }

            this.ctx.logger.info(`开始处理文件上传，文件信息:`, {
                filename: files[0].filename || files[0].originalFilename || 'unknown',
                filepath: files[0].filepath || files[0].path || 'unknown',
                size: files[0].size || 'unknown',
            });

            filePath = await this.handleFileUpload(files[0], serverId);

            // 文件解压完成后清理临时文件
            setTimeout(() => {
                this.cleanupFile(filePath);
            }, 5000); // 5秒后清理临时文件
        }

        if (updateData.env && Array.isArray(updateData.env)) {
            const envObj = {};
            updateData.env.forEach((item) => {
                if (item.key && item.value) {
                    envObj[item.key] = item.value;
                }
            });
            updateData.env = envObj;
        }

        // 检测关键配置变更，需要重启
        if (server.transport === 'stdio' && !needsRestart) {
            const keyConfigFields = ['command', 'args', 'env'];
            needsRestart = keyConfigFields.some((field) => {
                if (updateData[field] !== undefined) {
                    const oldValue = JSON.stringify(server[field]);
                    const newValue = JSON.stringify(updateData[field]);
                    return oldValue !== newValue;
                }
                return false;
            });

            if (needsRestart) {
                try {
                    await this.stopMCPServer(server.server_id);
                    this.ctx.logger.info(`MCP服务器配置变更前已停止: ${server.server_id}`);
                } catch (error) {
                    this.ctx.logger.error(
                        `MCP服务器配置变更前停止失败 [${server.server_id}]:`,
                        error.message
                    );
                }
            }
        }

        await server.update(convertKeysToSnakeCase(updateData));

        // 重新获取更新后的服务器信息
        await server.reload();

        // 如果需要重启且是stdio类型，则重启服务器
        if (needsRestart && server.transport === 'stdio') {
            try {
                await this.startMCPServer(server.server_id);
                this.ctx.logger.info(`MCP服务器更新成功并已启动: ${server.server_id}`);

                // 启动成功后，自动获取服务器信息
                setTimeout(async () => {
                    try {
                        await this.syncMCPServerInfo(server.server_id);
                        this.ctx.logger.info(`MCP服务器信息同步完成: ${server.server_id}`);
                    } catch (syncError) {
                        this.ctx.logger.error(
                            `MCP服务器信息同步失败 [${server.server_id}]:`,
                            syncError.message
                        );
                    }
                }, 2000); // 等待2秒后同步，确保服务器已完全启动
            } catch (error) {
                this.ctx.logger.error(
                    `MCP服务器更新成功但启动失败 [${server.server_id}]:`,
                    error.message
                );
            }
        }

        return server;
    }

    /**
     * 删除MCP服务器（软删除）
     * @param {String} serverId - 服务器ID
     */
    async deleteMCPServer(serverId) {
        const server = await this.findByServerId(serverId);
        if (!server) {
            this.ctx.throw(404, 'MCP服务器不存在');
        }

        // 如果服务器正在运行，先停止它
        if (server.status === 'running') {
            try {
                await this.stopMCPServer(serverId);
                this.ctx.logger.info(`MCP服务器删除时已停止: ${serverId}`);
            } catch (error) {
                this.ctx.logger.error(`MCP服务器删除时停止失败 [${serverId}]:`, error.message);
            }
        }

        await server.update({ is_delete: 1 });

        if (server.deploy_path && fs.existsSync(server.deploy_path)) {
            try {
                fs.rmSync(server.deploy_path, { recursive: true, force: true });
                this.ctx.logger.info(`部署目录已清理: ${server.deploy_path}`);
            } catch (error) {
                this.ctx.logger.error(`清理部署目录失败: ${server.deploy_path}`, error);
            }
        }

        return true;
    }

    /**
     * 增加使用次数
     * @param {String} serverId - 服务器ID
     */
    async incrementUseCount(serverId) {
        return await this.ctx.model.McpServer.increment('use_count', {
            where: {
                server_id: serverId,
                is_delete: 0,
            },
        });
    }

    /**
     * 获取热门标签
     */
    async getPopularTags() {
        const servers = await this.ctx.model.McpServer.findAll({
            where: {
                is_delete: 0,
                status: 1,
            },
            attributes: ['tags'],
        });

        const tagCount = {};
        servers.forEach((server) => {
            if (server.tags && Array.isArray(server.tags)) {
                server.tags.forEach((tag) => {
                    tagCount[tag] = (tagCount[tag] || 0) + 1;
                });
            }
        });

        // 按使用次数排序，返回前10个
        return Object.entries(tagCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));
    }

    /**
     * 生成部署路径
     * @param {String} serverId - 服务器名称
     */
    generateDeployPath(serverId) {
        const deployRoot = env.mcpDeployDir || '/opt/doraemon/mcp-servers/';
        return path.join(deployRoot, serverId);
    }

    /**
     * 处理文件上传
     * @param {Object} file - 上传的文件对象 (egg-multipart file模式)
     * @param {String} serverId - 服务器名称
     */
    async handleFileUpload(file, serverId) {
        const deployPath = this.generateDeployPath(serverId);

        // 确保部署目录存在
        if (!fs.existsSync(deployPath)) {
            fs.mkdirSync(deployPath, { recursive: true });
        }

        // 在file模式下，文件已经保存到临时目录
        const tempFilePath = file.filepath || file.path;
        const fileName = file.filename || file.originalFilename || file.name;

        if (!tempFilePath) {
            throw new Error('无法获取上传文件的临时路径');
        }

        if (!fs.existsSync(tempFilePath)) {
            throw new Error(`临时文件不存在: ${tempFilePath}`);
        }

        try {
            this.ctx.logger.info(
                `处理上传文件: ${fileName}, 临时路径: ${tempFilePath}, 文件大小: ${
                    file.size || 'unknown'
                } bytes`
            );

            // 解压文件到部署目录
            await this.extractFile(tempFilePath, deployPath);

            this.ctx.logger.info(`文件解压成功: ${tempFilePath} -> ${deployPath}`);
            return tempFilePath;
        } catch (error) {
            this.ctx.logger.error('文件上传处理失败:', error);
            throw new Error('文件上传处理失败: ' + error.message);
        }
    }

    /**
     * 解压文件到指定目录
     * @param {String} filePath - 文件路径
     * @param {String} extractPath - 解压目录
     */
    async extractFile(filePath, extractPath) {
        const fileName = path.basename(filePath).toLowerCase();
        const fileExtension = path.extname(filePath).toLowerCase();

        try {
            if (fileExtension === '.zip') {
                this.ctx.logger.info(`检测到ZIP文件，开始解压: ${fileName}`);
                await this.extractZip(filePath, extractPath);
            } else if (
                fileExtension === '.tar' ||
                fileExtension === '.gz' ||
                fileExtension === '.tgz'
            ) {
                this.ctx.logger.info(`检测到TAR/GZ文件，开始解压: ${fileName}`);
                await this.extractTar(filePath, extractPath);
            } else {
                throw new Error(`不支持的文件格式: ${fileExtension}`);
            }

            this.ctx.logger.info(`文件解压成功: ${filePath} -> ${extractPath}`);
        } catch (error) {
            this.ctx.logger.error('文件解压失败:', error);
            throw error;
        }
    }

    /**
     * 解压ZIP文件
     * @param {String} filePath - ZIP文件路径
     * @param {String} extractPath - 解压目录
     */
    async extractZip(filePath, extractPath) {
        return new Promise((resolve, reject) => {
            try {
                const zip = new AdmZip(filePath);
                zip.extractAllTo(extractPath, true);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 解压TAR文件
     * @param {String} filePath - TAR文件路径
     * @param {String} extractPath - 解压目录
     */
    async extractTar(filePath, extractPath) {
        return tar.x({
            file: filePath,
            cwd: extractPath,
        });
    }

    /**
     * 清理临时文件
     * @param {String} filePath - 文件路径
     */
    cleanupFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                this.ctx.logger.info(`临时文件清理成功: ${filePath}`);
            }
        } catch (error) {
            this.ctx.logger.error('临时文件清理失败:', error);
        }
    }

    /**
     * 检查MCP服务器是否正常运行
     * @param {String} serverId - 服务器ID
     */
    async checkMCPServerHealth(serverId) {
        const server = await this.findByServerId(serverId);
        if (!server) {
            throw new Error('MCP服务器不存在');
        }

        // 根据传输类型进行健康检查
        if (server.transport === 'stdio') {
            return await this.checkStdioServerHealth(server);
        } else if (server.transport === 'streamable-http') {
            return await this.checkHttpServerHealth(server);
        } else if (server.transport === 'sse') {
            return await this.checkSSEServerHealth(server);
        }

        return false;
    }

    /**
     * 检查STDIO类型服务器健康状态
     * @param {Object} server - 服务器配置
     */
    async checkStdioServerHealth(server) {
        try {
            // 检查部署路径是否存在
            if (!server.deploy_path || !fs.existsSync(server.deploy_path)) {
                return { healthy: false, error: '部署路径不存在' };
            }

            // 检查启动命令和参数
            if (!server.command) {
                return { healthy: false, error: '启动命令未配置' };
            }

            // 使用ping检查MCP服务器是否响应
            const pingResult = await this.pingMCPServer(server);
            return pingResult;
        } catch (error) {
            this.ctx.logger.error('STDIO服务器健康检查失败:', error);
            return { healthy: false, error: error.message };
        }
    }

    /**
     * 检查HTTP类型服务器健康状态
     * @param {Object} server - 服务器配置
     */
    async checkHttpServerHealth(server) {
        try {
            if (!server.http_url) {
                return { healthy: false, error: 'HTTP URL未配置' };
            }

            // 使用ping检查HTTP MCP服务器
            const pingResult = await this.pingMCPServer(server);
            return pingResult;
        } catch (error) {
            this.ctx.logger.error('HTTP服务器健康检查失败:', error);
            return { healthy: false, error: error.message };
        }
    }

    /**
     * 检查SSE类型服务器健康状态
     * @param {Object} server - 服务器配置
     */
    async checkSSEServerHealth(server) {
        try {
            if (!server.sse_url) {
                return { healthy: false, error: 'SSE URL未配置' };
            }

            // 使用ping检查SSE MCP服务器
            const pingResult = await this.pingMCPServer(server);
            return pingResult;
        } catch (error) {
            this.ctx.logger.error('SSE服务器健康检查失败:', error);
            return { healthy: false, error: error.message };
        }
    }

    /**
     * 同步MCP服务器信息（tools、prompts、resources）
     * @param {String} serverId - 服务器ID
     */
    async syncMCPServerInfo(serverId) {
        const server = await this.findByServerId(serverId);
        if (!server) {
            throw new Error('MCP服务器不存在');
        }

        const { healthy } = await this.pingMCPServer(server);
        await server.update({
            status: healthy ? 'running' : 'error',
        });

        const mcpClient = new MCPClient(this.ctx.logger);

        try {
            // 连接到MCP服务器
            const connected = await mcpClient.connect(server);
            if (!connected) {
                throw new Error('无法创建MCP客户端连接');
            }

            // 获取服务器信息
            const serverInfo = await mcpClient.getServerInfo();

            // 更新数据库记录
            await server.update({
                tools: serverInfo.tools || [],
                prompts: serverInfo.prompts || [],
                resources: serverInfo.resources || [],
                capabilities: serverInfo.capabilities || {},
                last_sync_at: new Date(),
            });

            this.ctx.logger.info(`MCP服务器信息同步成功: ${serverId}`, {
                toolsCount: serverInfo.tools?.length || 0,
                promptsCount: serverInfo.prompts?.length || 0,
                resourcesCount: serverInfo.resources?.length || 0,
            });

            return serverInfo;
        } catch (error) {
            this.ctx.logger.error(`MCP服务器信息同步失败 [${serverId}]:`, error);
            throw error;
        } finally {
            // 关闭客户端连接
            await mcpClient.close();
        }
    }

    /**
     * 使用MCP ping协议检查服务器状态
     * @param {Object} server - 服务器配置
     * @returns {Promise<{healthy: boolean, error?: string}>}
     */
    async pingMCPServer(server) {
        const mcpClient = new MCPClient(this.ctx.logger);

        try {
            // 连接到MCP服务器
            await mcpClient.connect(server);
            // 发送ping请求
            const result = await mcpClient.ping(15000);
            // 关闭连接
            await mcpClient.close();
            return result;
        } catch (error) {
            // 确保连接关闭
            await mcpClient.close();
            return { healthy: false, error: '无法创建MCP客户端连接: ' + error.message };
        }
    }

    async updateServerStatus(serverId, healthResult) {
        const server = await this.findByServerId(serverId);
        if (!server) {
            return;
        }

        const updateData = {
            status: healthResult.healthy ? 'running' : healthResult.error ? 'error' : 'stopped',
            last_ping_at: new Date(),
            ping_error: healthResult.error || null,
        };

        await server.update(updateData);

        this.ctx.logger.info(`服务器状态已更新 [${serverId}]:`, {
            status: updateData.status,
            error: updateData.ping_error,
        });
    }

    /**
     * 批量检查所有服务器状态
     */
    async checkAllServersHealth() {
        const servers = await this.ctx.model.McpServer.findAll({
            where: {
                is_delete: 0,
            },
        });

        this.ctx.logger.info(`开始检查 ${servers.length} 个MCP服务器的健康状态`);

        for (const server of servers) {
            try {
                const healthResult = await this.checkMCPServerHealth(server.server_id);
                await this.updateServerStatus(server.server_id, healthResult);
            } catch (error) {
                this.ctx.logger.error(`检查服务器状态失败 [${server.server_id}]:`, error);
                await this.updateServerStatus(server.server_id, {
                    healthy: false,
                    error: error.message,
                });
            }
        }

        this.ctx.logger.info(`完成所有MCP服务器健康状态检查`);
    }

    /**
     * 根据服务器ID查找服务器（辅助方法）
     * @param {String} serverId - 服务器ID
     * @returns {Promise<Object|null>} 服务器对象或null
     */
    async findByServerId(serverId) {
        return await this.ctx.model.McpServer.findOne({
            where: {
                server_id: serverId,
                is_delete: 0,
            },
        });
    }

    /**
     * 启动MCP服务器
     * @param {string} serverId 服务器ID
     */
    async startMCPServer(serverId) {
        const server = await this.findByServerId(serverId);
        if (!server) {
            this.ctx.throw(404, 'MCP服务器不存在');
        }

        this.ctx.logger.info(`开始启动MCP服务器: ${serverId}`);

        // 构建配置对象
        const config = buildMCPConfig(server);

        // 通过messenger发送启动请求到agent进程
        // agent 会在完成后发送结果消息，由 app.js 监听并更新数据库
        this.app.messenger.sendToAgent('mcpStart', { serverId, config });

        this.ctx.logger.info(`MCP服务器启动请求已发送: ${serverId}`);

        return true;
    }

    /**
     * 停止MCP服务器
     * @param {string} serverId 服务器ID
     */
    async stopMCPServer(serverId) {
        const server = await this.findByServerId(serverId);
        if (!server) {
            this.ctx.throw(404, 'MCP服务器不存在');
        }

        this.ctx.logger.info(`开始停止MCP服务器: ${serverId}`);

        // 通过messenger发送停止请求到agent进程
        // agent 会在完成后发送结果消息，由 app.js 监听并更新数据库
        this.app.messenger.sendToAgent('mcpStop', { serverId });

        this.ctx.logger.info(`MCP服务器停止请求已发送: ${serverId}`);
        return true;
    }

    /**
     * 重启MCP服务器
     * @param {string} serverId 服务器ID
     */
    async restartMCPServer(serverId) {
        const server = await this.findByServerId(serverId);
        if (!server) {
            this.ctx.throw(404, 'MCP服务器不存在');
        }

        this.ctx.logger.info(`开始重启MCP服务器: ${serverId}`);

        // 通过messenger发送重启请求到agent进程
        // agent 会在完成后发送结果消息，由 app.js 监听并更新数据库
        this.app.messenger.sendToAgent('mcpRestart', { serverId });

        this.ctx.logger.info(`MCP服务器重启请求已发送: ${serverId}`);
        return true;
    }

    /**
     * 处理MCP服务器启动结果（由消息监听器调用）
     * @param {string} serverId - 服务器ID
     * @param {boolean} success - 是否成功
     * @param {string} error - 错误信息
     */
    async handleMCPStartResult(serverId, success, error) {
        try {
            if (success) {
                try {
                    const healthResult = await this.checkMCPServerHealth(serverId);
                    await this.ctx.model.McpServer.update(
                        {
                            status: healthResult.healthy ? 'running' : 'error',
                            ping_error: healthResult.error || null,
                            last_ping_at: new Date(),
                        },
                        { where: { server_id: serverId } }
                    );
                    this.ctx.logger.info(
                        `MCP服务器启动后状态已更新 [${serverId}]: ${
                            healthResult.healthy ? 'running' : 'error'
                        }`
                    );
                } catch (checkError) {
                    this.ctx.logger.error(`MCP服务器启动后状态检查失败 [${serverId}]:`, checkError);
                }
            } else {
                // 启动失败，更新状态为错误
                await this.ctx.model.McpServer.update(
                    {
                        status: 'error',
                        ping_error: error,
                        last_ping_at: new Date(),
                    },
                    { where: { server_id: serverId } }
                );
                this.ctx.logger.error(`MCP服务器启动失败 [${serverId}]: ${error}`);
            }
        } catch (updateError) {
            this.ctx.logger.error(`更新MCP服务器状态失败 [${serverId}]:`, updateError);
        }
    }

    /**
     * 处理MCP服务器停止结果（由消息监听器调用）
     * @param {string} serverId - 服务器ID
     * @param {boolean} success - 是否成功
     * @param {string} error - 错误信息
     */
    async handleMCPStopResult(serverId, success, error) {
        try {
            await this.ctx.model.McpServer.update(
                {
                    status: success ? 'stopped' : 'error',
                    ping_error: success ? null : error,
                    last_ping_at: new Date(),
                },
                { where: { server_id: serverId } }
            );
            this.ctx.logger.info(
                `MCP服务器停止后状态已更新 [${serverId}]: ${success ? 'stopped' : 'error'}`
            );
        } catch (updateError) {
            this.ctx.logger.error(`更新MCP服务器停止状态失败 [${serverId}]:`, updateError);
        }
    }

    /**
     * 处理MCP服务器重启结果（由消息监听器调用）
     * @param {string} serverId - 服务器ID
     * @param {boolean} success - 是否成功
     * @param {string} error - 错误信息
     */
    async handleMCPRestartResult(serverId, success, error) {
        try {
            if (success) {
                try {
                    const healthResult = await this.checkMCPServerHealth(serverId);
                    await this.ctx.model.McpServer.update(
                        {
                            status: healthResult.healthy ? 'running' : 'error',
                            ping_error: healthResult.error || null,
                            last_ping_at: new Date(),
                        },
                        { where: { server_id: serverId } }
                    );
                    this.ctx.logger.info(
                        `MCP服务器重启后状态已更新 [${serverId}]: ${
                            healthResult.healthy ? 'running' : 'error'
                        }`
                    );
                } catch (checkError) {
                    this.ctx.logger.error(`MCP服务器重启后状态检查失败 [${serverId}]:`, checkError);
                }
            } else {
                // 重启失败，更新状态为错误
                await this.ctx.model.McpServer.update(
                    {
                        status: 'error',
                        ping_error: error,
                        last_ping_at: new Date(),
                    },
                    { where: { server_id: serverId } }
                );
                this.ctx.logger.error(`MCP服务器重启失败 [${serverId}]: ${error}`);
            }
        } catch (updateError) {
            this.ctx.logger.error(`更新MCP服务器重启状态失败 [${serverId}]:`, updateError);
        }
    }
}

module.exports = MCPService;
