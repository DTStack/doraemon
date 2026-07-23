# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

**项目**: dt-doraemon (哆啦A梦) — 开发者工具箱平台，包含代理服务、主机管理、配置中心、MCP 服务器注册中心、Skills 市场等模块。

**技术栈**: Egg.js 2.x + React 16 SSR + MySQL (Sequelize) + Webpack 4 + Redux + Socket.IO。

## 环境准备

项目使用 Node.js 18（`.nvmrc` 锁定为 `18.20.3`），依赖管理使用 Yarn。

```bash
# 切换到正确的 Node 版本
fnm use 18
# 或
nvm use

# 安装依赖
yarn install
```

## 常用命令

```bash
# 开发启动（Egg.js dev + Webpack HMR，访问 http://127.0.0.1:7001）
npm run dev

# 生产启动
npm start

# 构建前端资源
npm run build

# 代码检查
npm run lint          # prettier + eslint + stylelint
npm run lint:fix      # 自动修复
npm run check-types   # TypeScript 类型检查（仅前端 app/web/）

# 单独运行测试（主项目使用 Node.js 内置 test runner）
node --test test/*.test.js

# dt-skill CLI 子项目（独立 npm 包）
cd dt-skill
npm run build
npm run test:src      # vitest 测试
node bin/dt-skill.js --help
```

## 项目结构

```
app/
  controller/       # Egg.js 控制器（路由处理）
  service/          # Egg.js 服务层（业务逻辑）
  model/            # Sequelize 模型定义
  middleware/       # Egg.js 中间件（access, proxy）
  schedule/         # Egg.js 定时任务
  web/              # React 前端源码（SSR）
    pages/          # 页面组件
    router/         # React Router 配置
    store/          # Redux store（thunk + devtools）
    api/            # API 请求封装（基于 url + method 映射）
    layouts/        # 布局组件（basicLayout, sider, header）
  mcp/              # MCP 服务器生命周期管理逻辑
  agent/            # Agent 进程 MCP 相关处理器
  utils/            # 后端工具函数
config/
  config.default.js # Egg.js 默认配置
  config.local.js   # 本地开发配置（含 MySQL、Webpack）
  config.test.js    # 测试环境配置
  config.prod.js    # 生产配置
  plugin.js         # Egg.js 插件注册（sequelize, reactssr, io, ssh）
dt-skill/           # ClawHub CLI 子项目（TypeScript + Vitest，独立包）
specs/              # 功能规格说明文档
sql/                # 数据库初始化 SQL（doraemon.sql）
test/               # 主项目测试文件（Node.js 内置 test runner）
```

## 后端架构

### Egg.js 应用结构
- **入口**: `app.js` (AppBootHook) 和 `agent.js` (Agent 进程生命周期)。
- **路由**: `app/router.js` 集中定义所有 RESTful 路由和代理路由 `/proxy/:id/*`。
- **MCP 生命周期**: Agent 进程 (`agent.js`) 负责 MCP 服务器的启动、停止、重启代理。Worker 进程通过 `app.messenger` 与 Agent 通信。
- **定时任务**: `app/schedule/` 包含文章订阅和 MCP 健康检查任务。
- **文件上传**: 使用 Egg.js multipart，临时文件存放于 `cache/uploads/`，大小限制 200MB，白名单允许所有类型。

### 数据库
- **ORM**: Sequelize（`egg-sequelize` 插件）。
- **配置位置**: `config/config.local.js`（本地默认数据库 `doraemon_test`，host `127.0.0.1`，用户名 `root`，密码 `123456`）。
- **生产配置**: 从 `env.json` 的 `mysql.prod` 读取。
- **初始化**: 导入 `sql/doraemon.sql` 到 MySQL。

### 关键配置
- `env.json`: 存放 webhook URL、MySQL 配置、MCP 端口（`mcpEndpointPort: 7005`，`mcpInspectorWebPort: 7003`，`mcpInspectorServerPort: 7004`）。
- CSRF 已全局禁用（`config.default.js`）。
- `app.utils` 在 `app.js` 启动时挂载为全局工具对象。

## 前端架构

### 技术栈
- React 16.9 + Redux + Redux-Thunk + React Router 4
- Ant Design 4.15.6 + 自定义主题 (`theme.js`)
- TypeScript（仅用于前端 `app/web/`，编译目标 ES5）
- SCSS / Less（`app/web/scss/`，`app/web/pages/*/style.scss`）

### 构建
- Webpack 4 通过 `easywebpack-react` 配置（`webpack.config.js`）。
- 开发时自动注入 CSS（`injectCss: true`）。
- DLL 预打包：react, redux, react-router, xterm 等。
- 路径别名：`@` -> `app/web/`，`@env` -> `env.json`。
- 全局变量：`EASY_ENV_IS_DEV` 用于区分开发/生产环境。

### 状态管理
- Redux store 在 `app/web/store/index.ts` 创建，使用 `redux-devtools-extension`（开发环境）。
- Thunk 注入 `{ API }` 作为 extraArgument，API 通过 `app/web/api/index.ts` 根据 `url.ts` 中的 URL + method 配置自动生成。

### 路由
- 前端路由定义在 `app/web/router/index.ts`，使用 `react-router-config` 风格配置。
- 所有页面路由前缀为 `/page/*`，SSR 布局为 `BasicLayout`。
- 部分页面使用 `react-loadable` 做代码分割（如 ConfigDetail, SwitchHostsEdit）。

## 子项目 dt-skill (ClawHub CLI)

- **位置**: `dt-skill/`，独立的 npm 包，ES Module（`"type": "module"`）。
- **用途**: 命令行工具，用于安装、搜索、发布 agent skills 和 OpenClaw 包。
- **入口**: `bin/dt-skill.js`。
- **构建**: `node ./scripts/build.mjs`，输出到 `dist/`。
- **测试**: Vitest，配置在 `vitest.config.ts`（测试 `src/**/*.test.ts`）。
- **Node 版本要求**: `>=20`（与主项目的 `>=18` 不同）。

## 测试

- **主项目**: 使用 Node.js 内置 `node:test` + `node:assert/strict`。测试文件在 `test/*.test.js`。
- **dt-skill**: 使用 Vitest。运行 `cd dt-skill && npm run test:src`。
- **原则**: 测试时不应该绕过待测组件用 curl 模拟。如果要测 CLI，运行真正的 CLI 命令；如果要测 API，通过客户端发请求。

## 代码规范

- ESLint 继承 `ko-lint-config`（`.eslintrc.js`）。
- Prettier 继承 `ko-lint-config/.prettierrc`（`.prettierrc.js`）。
- Stylelint 继承 `ko-lint-config/.stylelintrc`（`.stylelintrc.js`）。
- Git 提交使用 Commitizen（`cz-conventional-changelog`），commit message 需符合 conventional commits 规范，由 husky + commitlint 校验。

## CI/CD

- GitHub Actions: `.github/workflows/CI.yml`。
- 在 `push` 到 `master` 或任意 `pull_request` 时触发。
- 流程: 安装依赖 -> Prettier -> ESLint -> Stylelint -> check-types -> build。
- Node 版本: 18.x，需设置 `NODE_OPTIONS=--openssl-legacy-provider`。

## 分支规范（CONTRIBUTING.md）

- `master`: 主干分支，用于生产发布。
- `dev`: 主开发分支。
- `feat_版本号_xxx`: 新特性分支，从 `master` 切出，开发完 PR 到 `dev`。
- `hotfix_版本号_xxx`: Bug 修复分支，从 `master` 切出，修复完 PR 到 `dev`，验证后合并到 `master`。
