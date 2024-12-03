const request = require('request');
const version = require('./package.json').version;
const config = require('./env.json');
const Logger = require('egg-logger').Logger;
const logger = new Logger('DingdingBot');
const botWebhookUrl = config && config.webhookUrls ? config.webhookUrls : []; // 钉钉通知群
const ApplicationTypeHeader = 'application/json;charset=utf-8';
// DingdingBot
class DingdingBot {
    _webhookUrl;
    constructor(webhookUrl) {
        this._webhookUrl = webhookUrl;
    }

    pushMsg(msg, _atMobiles) {
        try {
            const options = {
                headers: {
                    'Content-Type': ApplicationTypeHeader,
                },
                json: {
                    msgtype: 'actionCard',
                    actionCard: {
                        title: 'Doraemon发布通知',
                        text: `### Doraemon v${version} 发布成功 ![screenshot](https://img.pngio.com/my-impression-doraemon-is-my-favorite-cartoon-l-like-doraemon-doraemon-png-820_443.png) \n>致力于解放更多生产力，让日常工作变的更加高效、轻松、便捷、愉快～`,
                        btnOrientation: '0',
                        singleTitle: '阅读全文',
                        singleURL: config && config.msgSingleUrl ? config.msgSingleUrl : '',
                    },
                },
            };
            // eslint-disable-next-line n/handle-callback-err
            request.post(this._webhookUrl, options, function (error, response, body) {
                logger.debug(`push msg ${msg}, response: ${JSON.stringify(body)}`);
            });
        } catch (err) {
            console.error(err);
            return false;
        }
    }
}
botWebhookUrl.forEach((item) => {
    const bot = new DingdingBot(item);
    // 直接推送消息
    bot.pushMsg('发布通知');
});
