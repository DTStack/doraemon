const utils = require('./app/utils');
const httpProxy = require('http-proxy');
const http = require('http');
const getPort = require('get-port');
const proxy = httpProxy.createProxyServer({});

module.exports = class AppBootHook {
  constructor(app) {
    this.app = app;
  }
  async serverDidReady() {
    this.app.utils = utils;
  }
}