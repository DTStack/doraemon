module.exports = (app) => {
    const { STRING, TEXT, INTEGER, ENUM, JSON, DATE, TINYINT } = app.Sequelize;

    const McpServer = app.model.define(
        'mcp_server',
        {
            id: {
                type: INTEGER,
                primaryKey: true,
                autoIncrement: true,
                comment: '自增主键',
            },
            server_id: {
                type: STRING(128),
                allowNull: false,
                unique: true,
                comment: '服务器唯一标识/名称',
            },
            title: {
                type: STRING(200),
                allowNull: false,
                comment: '显示标题',
            },
            description: {
                type: TEXT,
                comment: '服务器描述(支持Markdown)',
            },
            short_description: {
                type: STRING(500),
                comment: '简短描述，用于卡片展示',
            },
            author: {
                type: STRING(100),
                allowNull: false,
                comment: '创建者',
            },
            version: {
                type: STRING(20),
                allowNull: false,
                comment: '版本号',
            },
            tags: {
                type: JSON,
                comment: '标签数组',
            },
            transport: {
                type: ENUM('stdio', 'sse', 'streamable-http'),
                allowNull: false,
                defaultValue: 'stdio',
                comment: '传输协议类型',
            },
            command: {
                type: STRING(255),
                comment: '启动命令(stdio类型)',
            },
            args: {
                type: JSON,
                comment: '命令参数数组(stdio类型)',
            },
            env: {
                type: JSON,
                comment: '环境变量对象(stdio类型)',
            },
            http_url: {
                type: STRING(500),
                comment: 'HTTP访问地址(http类型)',
            },
            sse_url: {
                type: STRING(500),
                comment: 'SSE访问地址(sse类型)',
            },
            git_url: {
                type: STRING(500),
                comment: 'Git源码地址',
            },
            deploy_path: {
                type: STRING(500),
                comment: '托管部署路径',
            },
            status: {
                type: ENUM('running', 'stopped', 'error'),
                allowNull: false,
                defaultValue: 'stopped',
                comment: '服务器状态 running-运行中 stopped-已停止 error-错误',
            },
            is_delete: {
                type: TINYINT,
                allowNull: false,
                defaultValue: 0,
                comment: '是否删除 1-已删除 0-未删除',
            },
            use_count: {
                type: INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: '使用次数',
            },
            tools: {
                type: JSON,
                comment: '可用工具列表',
            },
            prompts: {
                type: JSON,
                comment: '可用提示词列表',
            },
            resources: {
                type: JSON,
                comment: '可用资源列表',
            },
            capabilities: {
                type: JSON,
                comment: '服务器能力信息',
            },
            last_sync_at: {
                type: DATE,
                comment: '最后同步时间',
            },
            last_ping_at: {
                type: DATE,
                comment: '最后ping检查时间',
            },
            ping_error: {
                type: TEXT,
                comment: '最后ping检查错误信息',
            },
            created_at: {
                type: DATE,
                allowNull: false,
                defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
                comment: '创建时间',
            },
            updated_at: {
                type: DATE,
                allowNull: false,
                defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
                comment: '更新时间',
            },
        },
        {
            freezeTableName: true,
            tableName: 'mcp_servers',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [
                {
                    unique: true,
                    fields: ['server_id'],
                },
                {
                    fields: ['name'],
                },
                {
                    fields: ['author'],
                },
                {
                    fields: ['transport'],
                },
                {
                    fields: ['status', 'is_delete'],
                },
                {
                    fields: ['last_ping_at'],
                },
                {
                    fields: ['created_at'],
                },
            ],
        }
    );

    // 实例方法
    McpServer.prototype.toJSON = function () {
        const values = Object.assign({}, this.get());

        // 解析JSON字段
        if (values.tags && typeof values.tags === 'string') {
            try {
                values.tags = JSON.parse(values.tags);
            } catch (e) {
                values.tags = [];
            }
        }

        if (values.args && typeof values.args === 'string') {
            try {
                values.args = JSON.parse(values.args);
            } catch (e) {
                values.args = [];
            }
        }

        if (values.env && typeof values.env === 'string') {
            try {
                values.env = JSON.parse(values.env);
            } catch (e) {
                values.env = {};
            }
        }

        if (values.tools && typeof values.tools === 'string') {
            try {
                values.tools = JSON.parse(values.tools);
            } catch (e) {
                values.tools = [];
            }
        }

        if (values.prompts && typeof values.prompts === 'string') {
            try {
                values.prompts = JSON.parse(values.prompts);
            } catch (e) {
                values.prompts = [];
            }
        }

        if (values.resources && typeof values.resources === 'string') {
            try {
                values.resources = JSON.parse(values.resources);
            } catch (e) {
                values.resources = [];
            }
        }

        if (values.capabilities && typeof values.capabilities === 'string') {
            try {
                values.capabilities = JSON.parse(values.capabilities);
            } catch (e) {
                values.capabilities = {};
            }
        }

        return values;
    };

    return McpServer;
};
