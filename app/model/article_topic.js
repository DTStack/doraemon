module.exports = app => {
    const { STRING, INTEGER, DATE } = app.Sequelize;
    const ArticleTopic = app.model.define('article_topic', {
        id: { type: INTEGER, primaryKey: true, autoIncrement: true },
        siteName: STRING(64),
        topicName: STRING(255),
        topicUrl: STRING(255),
        sort: INTEGER,
        is_delete: { type: INTEGER(2), defaultValue: 0 },
        created_at: DATE,
        updated_at: DATE
    },{
        freezeTableName: true
    });
    return ArticleTopic;
};
  