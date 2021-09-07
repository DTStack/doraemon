module.exports = app => {
    const { STRING, INTEGER, DATE } = app.Sequelize;
    const ArticleSubscription = app.model.define('article_subscription', {
        id: { type: INTEGER, primaryKey: true, autoIncrement: true },
        groupName: STRING(64),
        webHook: STRING(500),
        remark: STRING(255),
        topicIds: STRING(255),
        sendType: { type: INTEGER(2), defaultValue: 1 },
        sendCron: STRING(255),
        status: { type: INTEGER(2), defaultValue: 1 },
        time: DATE,
        is_delete: { type: INTEGER(2), defaultValue: 0 },
        created_at: DATE,
        updated_at: DATE
    },{
        freezeTableName: true
    });
    return ArticleSubscription;
};
  