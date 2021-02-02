/**
 * ** WebSocket 封装
 * @ url         请求地址                   类型:string         默认:''       备注: 'web/msg'
 * @ isInit      是否自动执行                类型:boolean        默认:false    备注: false|true
 * @ openFn      自动执行open回调函数         类型:function       默认 : null    备注: 如果onOpen没有callBack,默认调用openFn
 * @ messageFn   自动执行消息回调函数         类型:function       默认: null    备注: 如果onMessage没有callBack,默认调用messageFn
 * @ errorFn     自动执行错误回调函数         类型:function       默认: null    备注: 如果onErrorFn没有callBack,默认调用errorFn
 *
 *
 * 方法:
 * isWebsocket   判断websocket 是否存在         返回 true|false      参数:无
 * onOpen        服务端与前端连接成功后触发开      返回 无              参数:callBack(e)
 * onMessage     服务端向前端发送消息时触发        返回 无              参数:callBack(e)
 * onError       WSC报错后触发                  返回 无              参数:callBack(e)
 * onClose       关闭WSC
 * onSend        前端向服务端发送消息时触发        返回 无              参数:data
 * readyState    获取WSC链接状态，只读不可修改
 * binaryType    获取WSC连接所传输二进制数据的类型,只读
 * get           获取当前实例                   返回 当前实例          参数:data
 * */
export class WS {
  constructor({
      url = '',
      openFn = null,
      messageFn = null,
      errorFn = null,
      isInit = false
    } = {}) {
    let loc = window.location;
    url = loc.host + '/' + url;
    this.url = /https/.test(loc.protocol) ? 'wss://' + url : 'ws://' + url;
    this.websocket = 'WebSocket' in window ? new WebSocket(this.url) : null;
    this.error = '';
    this.messageFn =
        messageFn && typeof messageFn == 'function'
          ? messageFn
          : e => {
            e;
          };
    this.errorFn =
        errorFn && typeof errorFn == 'function'
          ? errorFn
          : e => {
            e;
          };
    this.openFn =
        openFn && typeof openFn == 'function'
          ? openFn
          : e => {
            e;
          };
    if (isInit) {
      WS.init(this);
    }
  }
  
    //判断websocket 是否存在
  isWebsocket() {
    if (this.websocket) {
      this.error = '';
      return true;
    } else {
      this.error = '当前浏览器不支持WebSocket';
      return false;
    }
  }
  
    //直接开始执行链接,不需要手动设置打开 & 处理消息 & 错误
  static init(_this) {
    if (_this.isWebsocket()) {
      _this.websocket.onopen = e => {
        _this.openFn(e);
      };
  
      _this.websocket.onerror = e => {
        _this.errorFn(e);
      };
      _this.websocket.onmessage = e => {
        _this.messageFn(e);
      };
    } else {
      console.error(_this.error);
    }
  }
  
    //自定义WSC连接事件：服务端与前端连接成功后触发
  onOpen(callBack) {
    if (this.isWebsocket()) {
        //判断是否传递回调函数
      if (typeof callBack == 'function') {
        this.websocket.onopen = e => {
          callBack(e);
        };
      } else {
        this.websocket.onopen = e => {
          this.openFn(e);
        };
      }
    } else {
      console.error(this.error);
    }
  }
  
    // WSC消息接收事件：服务端向前端发送消息时触发
  onMessage(callBack) {
    if (this.isWebsocket()) {
      if (typeof callBack == 'function') {
        this.websocket.onmessage = e => {
          callBack(e);
        };
      } else {
        this.websocket.onmessage = e => {
          this.messageFn(e);
        };
      }
    } else {
      console.error(this.error);
    }
  }
  
    // 自定义WSC异常事件：WSC报错后触发
  onError(callBack) {
    if (this.isWebsocket()) {
      if (typeof callBack == 'function') {
        this.websocket.onerror = e => {
          callBack(e);
        };
      } else {
        this.websocket.onerror = e => {
          this.errorFn(e);
        };
      }
    } else {
      console.error(this.error);
    }
  }
  
    // 自定义WSC关闭事件：WSC关闭后触发
  onClose() {
    if (this.isWebsocket()) {
      this.websocket.close();
    } else {
      console.error(this.error);
    }
  }
  
    //前端向服务端发送消息时触发
  onSend(data) {
    console.log('dataweb--数据已向后端发送', data, this.isWebsocket());
    if (this.isWebsocket()) {
      console.log('sendsendsend');
      this.websocket.send(data);
    } else {
      console.error(this.error);
    }
  }
  
    //WSC链接状态，只读不可修改
  readyState() {
      //1连接已打开并准备好进行通信。2连接正在关闭。 3连接已关闭或无法打开。
    if (this.isWebsocket()) {
      return this.websocket.readyState;
    } else {
      console.error(this.error);
    }
  }
  
    //获取WSC连接所传输二进制数据的类型,只读
  binaryType() {
    if (this.isWebsocket()) {
      return this.websocket.binaryType;
    } else {
      console.error(this.error);
    }
  }
  
    //获取当前实例
  get() {
    if (this.isWebsocket()) {
      return this.websocket;
    } else {
      console.error(this.error);
    }
  }
  }
  
  