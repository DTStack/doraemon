module.exports = (app) => {
    const { INTEGER, STRING, TEXT, DATE, TINYINT } = app.Sequelize;

    const SkillsItem = app.model.define(
        'skills_item',
        {
            id: {
                type: INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            source_id: {
                type: INTEGER,
                allowNull: false,
                comment: '来源记录ID',
            },
            slug: {
                type: STRING(255),
                allowNull: false,
                unique: true,
                comment: '详情页唯一标识',
            },
            name: {
                type: STRING(255),
                allowNull: false,
            },
            description: {
                type: TEXT,
            },
            category: {
                type: STRING(64),
                allowNull: false,
                defaultValue: '通用',
            },
            tags: {
                type: TEXT('long'),
                comment: 'JSON字符串数组',
            },
            allowed_tools: {
                type: TEXT('long'),
                comment: 'JSON字符串数组',
            },
            stars: {
                type: INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            updated_at_remote: {
                type: DATE,
                comment: '源仓库文件更新时间',
            },
            source_repo: {
                type: STRING(1000),
                comment: '仓库地址',
            },
            source_path: {
                type: STRING(1000),
                comment: '仓库内 skill 相对路径',
            },
            skill_md: {
                type: TEXT('long'),
                comment: 'SKILL.md 原文',
            },
            install_command: {
                type: TEXT,
                comment: '推荐安装命令',
            },
            file_count: {
                type: INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            is_delete: {
                type: TINYINT,
                allowNull: false,
                defaultValue: 0,
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
            tableName: 'skills_items',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [
                { unique: true, fields: ['slug'] },
                { fields: ['source_id'] },
                { fields: ['category'] },
                { fields: ['stars'] },
                { fields: ['updated_at_remote'] },
            ],
        }
    );

    return SkillsItem;
};
