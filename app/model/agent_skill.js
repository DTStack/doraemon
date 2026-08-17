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
                comment: 'Skill slug',
            },
            skill_id: {
                type: INTEGER,
                allowNull: true,
                comment: 'skills_items.id',
            },
            relation_type: {
                type: STRING(20),
                allowNull: false,
                comment: 'entrypoint、dependency 或 private',
            },
            sort_order: {
                type: INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: '展示顺序',
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
            indexes: [
                { fields: ['agent_id'] },
                { fields: ['skill_slug'] },
                { fields: ['relation_type'] },
            ],
        }
    );

    return AgentSkill;
};
