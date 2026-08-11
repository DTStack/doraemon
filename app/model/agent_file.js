module.exports = (app) => {
    const { INTEGER, STRING, TEXT, DATE, TINYINT } = app.Sequelize;

    const AgentFile = app.model.define(
        'agent_file',
        {
            id: {
                type: INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            agent_id: {
                type: INTEGER,
                allowNull: false,
                comment: 'agents.id',
            },
            file_path: {
                type: STRING(512),
                allowNull: false,
                comment: 'Agent 内相对路径',
            },
            mime_type: {
                type: STRING(100),
                comment: '文件 MIME',
            },
            size: {
                type: INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: '文件大小',
            },
            is_binary: {
                type: TINYINT,
                allowNull: false,
                defaultValue: 0,
                comment: '是否二进制',
            },
            encoding: {
                type: STRING(20),
                allowNull: false,
                defaultValue: 'utf8',
                comment: '内容编码',
            },
            mode: {
                type: INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Unix 权限',
            },
            content: {
                type: TEXT('long'),
                comment: '文件内容',
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
            tableName: 'agent_files',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [{ unique: true, fields: ['agent_id', 'file_path'] }, { fields: ['agent_id'] }],
        }
    );

    return AgentFile;
};
