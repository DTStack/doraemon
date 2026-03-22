module.exports = (app) => {
    const { INTEGER, STRING, DATE } = app.Sequelize;

    const SkillLike = app.model.define(
        'skill_like',
        {
            id: {
                type: INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            skill_id: {
                type: INTEGER,
                allowNull: false,
                comment: '技能ID',
            },
            ip: {
                type: STRING(64),
                allowNull: false,
                comment: '点赞用户IP',
            },
            created_at: {
                type: DATE,
                allowNull: false,
                defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        },
        {
            freezeTableName: true,
            tableName: 'skill_likes',
            timestamps: false,
            indexes: [
                { fields: ['skill_id', 'ip'], unique: true },
                { fields: ['skill_id'] },
                { fields: ['ip'] },
            ],
        }
    );

    return SkillLike;
};
