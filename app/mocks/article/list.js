'use strict';
const data = {
    list: [
        {
            title: `Egg + React 服务端渲染骨架`,
            summary: '基于Egg + React + Webpack3/Webpack2 多页面和单页面服务器渲染同构工程骨架项目',
            hits: 550,
            url: 'https://github.com/hubcarl/egg-react-webpack-boilerplate',
        },
        {
            id: 1,
            title: '前端工程化解决方案easywebpack',
            summary: 'programming instead of configuration, webpack is so easy',
            hits: 550,
            url: 'https://github.com/hubcarl/easywebpack',
        },
        {
            id: 2,
            title: '前端工程化解决方案脚手架easywebpack-cli',
            summary: 'easywebpack command tool, support init Vue/Reac/Weex boilerplate',
            hits: 278,
            url: 'https://github.com/hubcarl/easywebpack-cli',
        },
        {
            title: 'react-渐进式JavaScript 框架',
            summary: '简单小巧的核心，渐进式技术栈，足以应付任何规模的应用',
            hits: 200,
            url: 'https://cn.reactjs.org',
        },
        {
            title: 'webpack配置官方文档',
            summary: 'webpack is a module bundler for modern JavaScript applications.',
            hits: 550,
            url: 'https://webpack.js.org/configuration/',
        },
        {
            title: 'egg-为企业级框架和应用而生',
            summary: 'Born to buildbetter enterprise frameworks and apps with Node.js & Koa',
            hits: 278,
            url: 'https://eggjs.org/',
        },
        {
            title: 'axios-基于 Promise 的 HTTP 请求客户端',
            summary: '基于 Promise 的 HTTP 请求客户端，可同时在浏览器和 node.js 中使用',
            hits: 998,
            url: 'https://www.awesomes.cn/repo/mzabriskie/axios',
        },
        {
            title: 'Centralized State Management for react.js',
            summary: 'reactx 是一个专为react.js 应用程序开发的状态管理模式',
            hits: 232,
            url: 'https://github.com/reactjs/reactx',
        },
        {
            title: 'react服务器渲染',
            summary: '服务器渲染可以加快首屏速度,利于SEO',
            hits: 565,
            url: 'http://csbun.github.io/blog/2016/08/react-2-0-server-side-rendering/',
        },
        {
            title: 'webpack服务器构建',
            summary: 'Webpack is an amazing tool.',
            hits: 988,
            url: 'http://jlongster.com/Backend-Apps-with-Webpack--Part-I',
        },
        {
            title: 'react component loader for Webpack',
            summary: 'Webpack loader for react.js components',
            hits: 322,
            url: 'https://github.com/reactjs/react-loader',
        },
        {
            title: 'react-router--The official router for react.js',
            summary:
                'It deeply integrates with react.js core to make building Single Page Applications with react.js a breeze',
            hits: 566,
            url: 'https://github.com/reactjs/react-router',
        },
        {
            title: 'react生命周期',
            summary: 'react.js 生命周期和route的生命周期讲解',
            hits: 434,
            url: 'http://www.jianshu.com/p/e9f884b6ba6c',
        },
        {
            title: 'babel到底将代码转换成什么鸟样',
            summary:
                '将babel捧作前端一个划时代的工具一定也不为过，它的出现让许多程序员幸福地用上了es6新语法',
            hits: 432,
            url: 'https://github.com/lcxfs1991/blog/issues/9',
        },
        {
            title: 'HTTP2 的真正性能到底如何',
            summary: 'HTTP2 的真正性能到底如何',
            hits: 565,
            url: 'https://segmentfault.com/a/1190000007219256?utm_source=weekly&utm_medium=email&utm_campaign=email_weekly',
        },
        {
            title: 'HTTP,HTTP2.0,SPDY,HTTPS讲解',
            summary: '使用SPDY加快你的网站速度',
            hits: 787,
            url: 'http://www.alloyteam.com/2016/07/httphttp2-0spdyhttps-reading-this-is-enough/',
        },
        {
            title: 'git - 简明指南',
            summary: '助你入门 git 的简明指南',
            hits: 121,
            url: 'http://rogerdudler.github.io/git-guide/index.zh.html',
        },
        {
            title: 'react从1升级到2',
            summary: 'Migrating from v1 to v2',
            hits: 555,
            url: 'https://webpack.js.org/guides/migrating/',
        },
    ],
};

let id = 1;

data.list = data.list.concat(data.list);
data.list = data.list.concat(data.list);

data.list.forEach((item) => {
    item.id = id++;
});

const total = data.list.length;
exports.getPage = (pageIndex = 1, pageSize = 10) => {
    const start = (pageIndex - 1) * pageSize;
    const end = start + Number(pageSize);
    return { list: data.list.slice(start, end), total };
};

exports.getDetail = (id) => {
    return data.list
        .filter((item) => {
            return item.id === id;
        })
        .slice(0, 1);
};
