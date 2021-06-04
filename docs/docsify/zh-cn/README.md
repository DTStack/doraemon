# 哆啦 A 梦 (Doraemon)  Here, you can find everything you need

一个帮你整理日常开发、配置、代理服务、主机等资源的管理工具。

## 功能

- 改变传统前后端联调方式，接口联调时，不再需要前后端重启本地服务。

- 支持收纳、分享常用、好用的的应用链接

- 支持多环境的主机（Host）账号和密码等信息进行维护

- 支持远程服务主机上的配置文件修改

- 支持本地 Hosts 文件的统一维护

## 环境支持

- node >= 8.0.0

## 快速开始

### 安装

```bash
git clone git@github.com:DTStack/doraemon.git

cd doraemon
```

#### 安装依赖
我们推荐使用 yarn 进行依赖安装。

```bash
yarn install
```

#### 数据库导入

1. 请先在服务下创建数据库

2. 找到目录下 `sql` 文件夹，将文件夹下的 `doraemon.sql` 文件导入到刚才创建好的数据库中

3. 请参考配置 [MySQL](zh-cn/configuration/mysql)，配置数据库连接

### 启动

#### 本地开发启动应用

```bash
yarn dev
```

应用访问: http://127.0.0.1:7001

#### 发布模式启动应用

```bash
yarn start 

yarn start:test // 测试环境发布
```

#### 项目构建

```bash
npm start // 直接运行(编译文件全部在内存里面,本地开发使用)

npm run build 或者 easywebpack build prod // 编译文件到磁盘打包使用(发布正式环境)
```

## 如何贡献

欢迎大家参与贡献，在任何形式的参与前，请先阅读 [贡献者文档](zh-cn/other/贡献者文档)。

## ChangeLog

每个版本的详细更改都记录在 [ChangeLog](zh-cn/other/CHANGELOG)

## License

[MIT](LICENSE)
