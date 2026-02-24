module.exports = (app) => {
    const { INTEGER, STRING, TEXT, DATE, TINYINT } = app.Sequelize;

    const SkillsFile = app.model.define(
        'skills_file',
        {
            id: {
                type: INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            skill_id: {
                type: INTEGER,
                allowNull: false,
                comment: 'skills_items.id',
            },
            file_path: {
                type: STRING(1000),
                allowNull: false,
                comment: '文件相对路径',
            },
            language: {
                type: STRING(64),
                allowNull: false,
                defaultValue: 'text',
            },
            size: {
                type: INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            is_binary: {
                type: TINYINT,
                allowNull: false,
                defaultValue: 0,
            },
            encoding: {
                type: STRING(16),
                allowNull: false,
                defaultValue: 'utf8',
            },
            content: {
                type: TEXT('long'),
                comment: '文本内容或base64内容',
            },
            updated_at_remote: {
                type: DATE,
                comment: '源仓库文件更新时间',
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
            tableName: 'skills_files',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [
                { fields: ['skill_id'] },
                { unique: true, fields: ['skill_id', 'file_path'] },
            ],
        }
    );

    return SkillsFile;
};
