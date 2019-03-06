class AppBootHook {
  constructor(app) {
    this.app = app;
  }
  async didLoad() {
    console.log('所有的配置已经加载完毕')
  }
}