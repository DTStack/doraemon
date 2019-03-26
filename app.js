const utils = require('./app/utils');

module.exports = class AppBootHook {
  constructor(app) {
    this.app = app;
  }
  async serverDidReady() {
    this.app.utils = utils;
  }
}