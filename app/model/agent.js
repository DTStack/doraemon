module.exports = (app) => {
    const { INTEGER, STRING, TEXT, DATE, TINYINT } = app.Sequelize;

    const Agent = app.model.define(
        'agent',
        {
            id: {
                type: INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: STRING(100),
                allowNull: false,
                unique: true,
                comment: 'Agent 唯一标识',
            },
            display_name: {
                type: STRING(255),
                allowNull: false,
                comment: 'Agent 展示名称',
            },
            version: {
                type: STRING(64),
                allowNull: false,
                defaultValue: '',
                comment: 'Agent 版本号',
            },
            description: {
                type: TEXT,
                comment: '列表摘要',
            },
            profile: {
                type: TEXT('long'),
                comment: 'Agent 详细简介',
            },
            author_name: {
                type: STRING(255),
                comment: '作者',
            },
            category: {
                type: STRING(64),
                allowNull: false,
                defaultValue: '通用',
                comment: '分类',
            },
            tags: {
                type: TEXT('long'),
                comment: 'JSON 字符串数组',
            },
            prompts: {
                type: TEXT('long'),
                comment: 'JSON 字符串数组',
            },
            capabilities: {
                type: TEXT('long'),
                comment: 'JSON 字符串数组',
            },
            demo_images: {
                type: TEXT('long'),
                comment: 'JSON 字符串数组',
            },
            entrypoint_host: {
                type: STRING(64),
                comment: '入口宿主',
            },
            entrypoint_type: {
                type: STRING(64),
                comment: '入口类型',
            },
            entrypoint_name: {
                type: STRING(255),
                comment: '入口名称',
            },
            entrypoint_ref: {
                type: STRING(1000),
                comment: '入口路径',
            },
            logo_path: {
                type: STRING(1000),
                comment: 'Logo 相对路径',
            },
            logo_mime_type: {
                type: STRING(100),
                comment: 'Logo MIME',
            },
            logo_size: {
                type: INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Logo 大小',
            },
            logo_hash: {
                type: STRING(128),
                comment: 'Logo 哈希',
            },
            content_hash: {
                type: STRING(128),
                allowNull: false,
                comment: '内容哈希',
            },
            source_file_name: {
                type: STRING(255),
                comment: '上传文件名',
            },
            file_count: {
                type: INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: '文件数量',
            },
            is_delete: {
                type: TINYINT,
                allowNull: false,
                defaultValue: 0,
                comment: '是否删除',
            },
            created_at: {
                type: DATE,
                allowNull: false,
                defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: DATE,
                allowNull: false,
                defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        },
        {
            freezeTableName: true,
            tableName: 'agents',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [
                { unique: true, fields: ['name'] },
                { fields: ['category'] },
                { fields: ['updated_at'] },
            ],
        }
    );

    return Agent;
};
