const request = require('request');
const Logger = require('egg-logger').Logger;
const version = require('./package.json').version;
const logger = new Logger('DingdingBot');
const botWebhookUrl = [   //钉钉通知群
  'https://oapi.dingtalk.com/robot/send?access_token=a057e200b4fccf4377604b8d9a742674f0ec3da5a6b14ef3c5ed61f600ac96c9', //数栈效能
  'https://oapi.dingtalk.com/robot/send?access_token=b09a948795da8eba665841dd785f565eb31065682558db930b9c04523ee00424', //数栈前端组
  'https://oapi.dingtalk.com/robot/send?access_token=9f183905e343575ef8ac03821b2188b7768be18e100d1e6164df77dd5dd9ee3f' //多啦A梦内部组
];
const ApplicationTypeHeader = 'application/json;charset=utf-8';
// DingdingBot
class DingdingBot{
  _webhookUrl;
  constructor(webhookUrl){
    this._webhookUrl = webhookUrl;
  }

  pushMsg (msg, atMobiles){
    try {
            
      let options = {
        headers: {
          'Content-Type': ApplicationTypeHeader
        },
        json: {
          'msgtype': 'actionCard',
          'actionCard': {
            'title': 'Doraemon发布通知', 
            'text': `### Doraemon v${version} 发布成功 ![screenshot](https://img.pngio.com/my-impression-doraemon-is-my-favorite-cartoon-l-like-doraemon-doraemon-png-820_443.png) \n>致力于解放更多生产力，让日常工作变的更加高效、轻松、便捷、愉快～`, 
            'btnOrientation': '0', 
            'singleTitle' : '阅读全文',
            'singleURL' : 'https://dtstack.yuque.com/rd-center/sm6war/mtczaq'
          }
        }
      };
      request.post(this._webhookUrl, options, function(error, response, body){
        logger.debug(`push msg ${msg}, response: ${JSON.stringify(body)}`);
      });
    }
    catch(err) {
      console.error(err);
      return false;
    }        
  }
}
botWebhookUrl.forEach(item=>{
  let bot = new DingdingBot(item);;
    // 直接推送消息
  bot.pushMsg('发布通知');
})
