module.exports = (app) => {
    const { INTEGER, STRING, DATE } = app.Sequelize;

    const AgentSkill = app.model.define(
        'agent_skill',
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
            skill_slug: {
                type: STRING(255),
                allowNull: false,
                comment: 'Skill 标识（包内 SKILL.md 解析出的 name 或目录名）',
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
            tableName: 'agent_skills',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [{ fields: ['agent_id'] }, { fields: ['skill_slug'] }],
        }
    );

    return AgentSkill;
};
