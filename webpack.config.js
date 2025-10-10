'use strict';
const path = require('path');
const theme = require('./theme');
const resolve = (filepath) => path.resolve(__dirname, filepath);
module.exports = {
    entry: {
        app: resolve('app/web/main.tsx'),
    },
    dll: [
        'react',
        'react-dom',
        'react-redux',
        'redux',
        'redux-thunk',
        'react-router',
        'react-router-config',
        'react-router-dom',
        'react-router-redux',
        'xterm',
    ],
    loaders: {
        babel: {
            include: [resolve('app/web'), resolve('node_modules')],
        },
        less: {
            include: [resolve('./app/web'), resolve('./node_modules')],
            options: {
                javascriptEnabled: true,
                modifyVars: theme,
            },
        },
        typescript: true,
        scss: true,
        css: true,
        urlimage: true,
        urlfont: true,
    },
    alias: {
        '@': resolve('app/web'),
        '@env': resolve('./env.json'),
    },
    plugins: {
        imagemini: false,
    },
    done() {
        console.log('---webpack compile finish---');
    },
};
