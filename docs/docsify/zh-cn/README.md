# 哆啦 A 梦 (Doraemon)  Here, you can find everything you need

> 致力于解放更多生产力，让日常工作变的更加高效、轻松、便捷、愉快～

## 简介

哆啦 A 梦（Doraemon）是一个帮你整理日常开发、配置、代理服务、主机等资源的管理工具。

通过应用中心可收纳、分享常用、好用的的应用链接；多环境的主机（Host）账号和密码等信息，在这里我们都可以统一管理维护，便于查看和管理；配置管理模块，可轻松维护远程服务主机上的配置文件；在线代理（Proxy）改变传统前后端联调方式，接口联调时，不再需要前后端另起本地服务。另外，前端同学需求切换开发环境时，只需要在线简单的配置即可。

我们正在不断迭代和完善中，还有更多功能等待你的探索。

## 特性

- 基于 Egg + AntD + EasyWebpack 的服务端项目

- React-Router, React-Redux 服务端/客户端单页面渲染

- 支持 AntD 按需加载和主题定制

## 项目结构和基本规范

    ├── app
    │   ├── controller
    │   │   ├── test
    │   │   │   └── test.js
    │   ├── extend
    │   ├── lib
    │   ├── middleware
    │   ├── mocks
    │   ├── proxy
    │   ├── router.js
    │   ├── view
    │   │   ├── about                         // 服务器编译的jsbundle文件
    │   │   │   └── about.js
    │   │   ├── home
    │   │   │     └── home.js                 // 服务器编译的jsbundle文件
    │   │   └── layout.js                     // 编译的layout文件
    │   └── web                               // 前端工程目录
    │       ├── asset                         // 存放公共js,css资源
    │       ├── framework                     // 前端公共库和第三方库
    │       │   └── entry                          
    │       │       ├── loader.js              // 根据jsx文件自动生成entry入口文件loader
    │       ├── page                              // 前端页面和webpack构建目录, 也就是webpack打包配置entryDir
    │       │   ├── home                          // 每个页面遵循目录名, js文件名, scss文件名, tsx文件名相同
    │       │   │   ├── home.scss
    │       │   │   ├── home.tsx
    │       │   └── hello                          // 每个页面遵循目录名, js文件名, scss文件名, tsx文件名相同
    │       │       ├── test.css                   // 服务器render渲染时, 传入 render('test/test.tsx', data)
    │       │       └── test.tsx
    │       ├── store                             
    │       │   ├── app
    │       │   │   ├── actions.js
    │       │   │   ├── getters.js
    │       │   │   ├── main.js
    │       │   │   ├── mutation-type.js
    │       │   │   └── mutations.js
    │       │   └── store.js
    │       └── component                         // 公共业务组件, 比如loading, toast等, 遵循目录名, js文件名, scss文件名, tsx文件名相同
    │           ├── loading
    │           │   ├── loading.scss
    │           │   └── loading.tsx
    │           ├── test
    │           │   ├── test.tsx
    │           │   └── test.scss
    │           └── toast
    │               ├── toast.scss
    │               └── toast.tsx
    ├── config
    │   ├── config.default.js
    │   ├── config.local.js
    │   ├── config.prod.js
    │   ├── config.test.js
    │   └── plugin.js
    ├── doc
    ├── main.js
    ├── webpack.config.js                      // easywebpack-cli 构建配置
    ├── public                                 // webpack编译目录结构, render文件查找目录
    │   ├── static
    │   │   ├── css
    │   │   │   ├── home
    │   │   │   │   ├── home.07012d33.css
    │   │   │   └── test
    │   │   │       ├── test.4bbb32ce.css
    │   │   ├── img
    │   │   │   ├── change_top.4735c57.png
    │   │   │   └── intro.0e66266.png
    │   ├── test
    │   │   └── test.js
    │   └── vendor.js                         // 生成的公共打包库


## License

[MIT](LICENSE)
