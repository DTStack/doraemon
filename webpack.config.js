'use strict';
const path = require('path');
const resolve = (filepath) => path.resolve(__dirname, filepath);

const theme = require('./theme');
module.exports = {
  entry: {
    app: resolve('./app/web/main.js')
  },
  dll: ['react', 'react-dom','react-redux','redux','redux-thunk','react-router','react-router-config','react-router-dom','react-router-redux'],
  loaders: {
    babel: {
      include: [resolve('./app/web')],
      exclude: [resolve('./node_modules')]
    },
    less: {
      include: [resolve('./app/web'), resolve('./node_modules')],
      options: {
        javascriptEnabled: true,
        modifyVars:theme
      }
    },
    scss: true,
    urlimage: true,
    urlfont: true,
    css:true
  },
  resolve:{
    extensions: ['.js', '.jsx', '.scss', '.css','less' ,'.json'],
    alias: {
      '@':resolve('./app/web')
    }
  },
  plugins:[],
  done() {
    console.log('---webpack compile finish---');
  }
};
