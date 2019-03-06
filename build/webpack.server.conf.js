const webpackBaseConfig= require('./webpack.base.conf')
const easywebpack = require('easywebpack-react')
const merge = easywebpack.merge

module.exports = merge(webpackBaseConfig,{
  mode:'production',
  devtool: 'cheap-eval-source-map'
})


