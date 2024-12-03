module.exports = (app) => {
    const { STRING, INTEGER, DATE } = app.Sequelize;
    const ArticleSubscription = app.model.define(
        'article_subscription',
        {
            id: { type: INTEGER, primaryKey: true, autoIncrement: true },
            groupName: STRING(64),
            webHook: STRING(500),
            remark: STRING(255),
            topicIds: STRING(255),
            siteNames: STRING(255),
            sendType: { type: INTEGER(2), defaultValue: 1 },
            sendCron: STRING(255),
            time: STRING(255),
            status: { type: INTEGER(2), defaultValue: 1 },
            is_delete: { type: INTEGER(2), defaultValue: 0 },
            created_at: DATE,
            updated_at: DATE,
            messageTitle: STRING(64),
            message: STRING(2000),
            isAtAll: { type: INTEGER(2), defaultValue: 0 },
        },
        {
            freezeTableName: true,
        }
    );
    return ArticleSubscription;
};
