module.exports = (app) => {
    const { INTEGER, STRING, TEXT, DATE, TINYINT } = app.Sequelize;

    const SkillsSource = app.model.define(
        'skills_source',
        {
            id: {
                type: INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            source_url: {
                type: STRING(1000),
                allowNull: false,
                unique: true,
                comment: '用户输入的来源地址',
            },
            source_type: {
                type: STRING(32),
                allowNull: false,
                defaultValue: 'git',
                comment: '来源类型 github/gitlab/git/local',
            },
            clone_url: {
                type: STRING(1000),
                allowNull: false,
                comment: '用于 clone 的仓库地址',
            },
            source_repo: {
                type: STRING(1000),
                allowNull: false,
                comment: '用于安装命令展示的仓库地址',
            },
            ref: {
                type: STRING(255),
                comment: '分支或标签',
            },
            subpath: {
                type: STRING(1000),
                comment: '仓库内相对子目录',
            },
            repo_host: {
                type: STRING(255),
                comment: '仓库域名',
            },
            repo_path: {
                type: STRING(500),
                comment: '仓库路径 owner/repo 或 group/subgroup/repo',
            },
            sync_status: {
                type: STRING(32),
                allowNull: false,
                defaultValue: 'idle',
                comment: '同步状态 idle/syncing/failed',
            },
            sync_error: {
                type: TEXT,
                comment: '最近一次同步错误',
            },
            last_synced_at: {
                type: DATE,
                comment: '最近同步时间',
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
            tableName: 'skills_sources',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [
                { unique: true, fields: ['source_url'] },
                { fields: ['repo_host'] },
                { fields: ['repo_path'] },
                { fields: ['sync_status'] },
            ],
        }
    );

    return SkillsSource;
};
