# Doraemon开发和发布流程

#### 本地开发启动

``` javascript
1、 git clone
2、 git checkout - b
3、 yarn
4、 git branch - b //开发分支命名feat_,bug分支hotfix
5、 npm run dev
```

#### 访问链接

``` javascript
http: //127.0.0.1:7001
```

#### 开发数据库

``` javascript
database: 'doraemon_test' //publish database: doraemon
host: '172.16.100.225'
port: 3306

表同步
开发阶段所有表变更在测试库doraemon_test
开发结束测试后navicat同步变更到doraemon
```

#### 建表方式

``` javascript
手动建表 //navicat直接操作
```

#### 发布流程

``` javascript
1、 release合到master并打tag //npm run release
2、 版本发布邮件通知
3、 登到 172.16 .100 .225 重新拉取代码
路径： / home / app / doraemon
git pull
git checkout master
5、 执行yarn start
6、 上线验证
7、 版本发布成功邮件通知
```

#### Doraemon GIT工作流

``` javascript
一.分支管理

1. master // 主分支，上线分支
2. dev 开发分支 // 所有临时分支(feat, hotfix)都要合到dev上
3. feat 新特性分支
4. hotfix 常规bug修复分支
5. release 预发布分支

二.Workflow

1. 本次迭代要上的

master
    -
    > feat / hotfix -
    > dev & release（ 注： dev和release都要合， 测试用哪个分支都可以） -
    > 预上线前release终测 -
    > 基于release打tag合到master

2. 本次迭代不上， 但已经预先开发的

master
    -
    > feat / hotfix -
    > dev -
    > 等到要上的那个版本在合到release
```
