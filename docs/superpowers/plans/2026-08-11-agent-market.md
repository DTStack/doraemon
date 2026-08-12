# Agent Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Doraemon 落地可导入 ZIP、可从数据库读取列表与详情、可流式返回资源文件的 Agent 市场第一版

**Architecture:** 复用现有 Skill 市场的路由、控制器和页面骨架，新增独立的 `agents + agent_files + agent_skills` 数据模型与 `agents` 服务。导入时将 ZIP 先解压到临时目录，校验并解析 `agent.yaml` 后，把结构化字段写入数据库、把 `assets/` 写入 `/data/doraemon/agent-market` 配置目录，再通过数据库索引对外提供列表、详情、相关推荐和图片流接口。

**Tech Stack:** Egg.js 2.x、Sequelize、React 16、Ant Design 4、Node.js test runner、SCSS

## Global Constraints

- 必须保留现有 Skill 市场实现，不重构 `skills_*` 表和页面
- 一个 ZIP 只允许一个 Agent，且必须包含唯一顶层目录和根部 `agent.yaml`
- 图片二进制不能写入数据库，只能保存到 `config.agentMarket.storageDir`
- 列表、详情、图片接口都必须以数据库为正式数据源
- 图片 URL 不能暴露服务器绝对路径，也不能返回 Base64
- 导入失败时不能留下半写入的数据库记录或本次新增资源目录
- 详情页只展示 `概览 / Agent 简介 / Agent 能力` 三个页签
- “安装”“使用”按钮只弹 `message.info('安装')` / `message.info('使用')`
- Demo 图片按内容宽度 100% 展示，高度自适应，图片间距 16px
- 分类复用 Skills 分类选项，相关推荐只按依赖 Skills 交集计算

---

### Task 1: 建立 Agent 数据模型与后端测试骨架

**Files:**
- Create: `app/model/agent.js`
- Create: `app/model/agent_file.js`
- Create: `app/model/agent_skill.js`
- Create: `test/agent-market-service.test.js`
- Modify: `sql/doraemon.sql`

**Interfaces:**
- Consumes: `app.Sequelize`、现有 Skills 分类常量
- Produces: `app.model.Agent`、`app.model.AgentFile`、`app.model.AgentSkill`

- [ ] **Step 1: 写后端红灯测试**

```js
test('Agent 模型字段包含资源索引和内容快照字段', async () => {
    const agent = require('../app/model/agent');
    assert.equal(typeof agent, 'function');
});
```

- [ ] **Step 2: 运行单测确认失败**

Run: `node --test test/agent-market-service.test.js`
Expected: FAIL，提示 `Cannot find module '../app/model/agent'`

- [ ] **Step 3: 最小实现三个模型和 SQL 表结构**

```js
module.exports = (app) => {
    const { INTEGER, STRING, TEXT, DATE, TINYINT } = app.Sequelize;
    return app.model.define('agent', {
        name: { type: STRING(100), allowNull: false, unique: true },
        // 其余字段按设计文档补齐
    }, {
        tableName: 'agents',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });
};
```

- [ ] **Step 4: 重跑单测确认通过**

Run: `node --test test/agent-market-service.test.js`
Expected: PASS

- [ ] **Step 5: 提交当前阶段**

```bash
git add app/model/agent.js app/model/agent_file.js app/model/agent_skill.js sql/doraemon.sql test/agent-market-service.test.js
git commit -m "feat: add agent market models"
```

### Task 2: 按 TDD 落地 Agent 导入、更新、删除和资源读取服务

**Files:**
- Create: `app/service/agents.js`
- Create: `app/controller/agents.js`
- Modify: `app/router.js`
- Modify: `config/config.default.js`
- Modify: `test/agent-market-service.test.js`

**Interfaces:**
- Consumes: `ctx.request.files`、`app.model.Agent`、`app.model.AgentFile`、`app.model.AgentSkill`
- Produces:
  - `ctx.service.agents.queryAgentList(params)`
  - `ctx.service.agents.getAgentDetail(name)`
  - `ctx.service.agents.getRelatedAgents(name, limit)`
  - `ctx.service.agents.importAgentFile(params, file)`
  - `ctx.service.agents.deleteAgent(params)`
  - `ctx.service.agents.getAgentAssetStream(params)`

- [ ] **Step 1: 为导入规则和资源读取写失败测试**

```js
test('导入单 Agent ZIP 时会拆出结构化字段并保存资源相对路径', async () => {
    const service = createAgentsService();
    await assert.rejects(() => service.importAgentFile({}, mockZipFile));
});
```

- [ ] **Step 2: 运行单测确认失败**

Run: `node --test test/agent-market-service.test.js`
Expected: FAIL，提示 `service.importAgentFile is not a function`

- [ ] **Step 3: 最小实现导入与查询主链路**

```js
async importAgentFile(params, file) {
    await this.ensureStorageReady();
    const parsed = await this.parseAgentZip(file);
    return this.app.model.transaction(async (transaction) => {
        return this.saveAgentSnapshot(parsed, transaction);
    });
}
```

- [ ] **Step 4: 增加控制器与路由，补配置项**

```js
app.get('/api/agents/list', app.controller.agents.getAgentList);
app.get('/api/agents/detail', app.controller.agents.getAgentDetail);
app.get('/api/agents/related', app.controller.agents.getRelatedAgents);
app.get('/api/agents/asset', app.controller.agents.getAgentAsset);
app.post('/api/agents/import-file', app.controller.agents.importAgentFile);
app.post('/api/agents/delete', app.controller.agents.deleteAgent);
```

- [ ] **Step 5: 重跑服务测试确认通过**

Run: `node --test test/agent-market-service.test.js`
Expected: PASS，覆盖导入成功、低版本拒绝、完整快照删除旧文件、资源路径校验、删除不影响 Skills

### Task 3: 落地 Agent 市场列表页、详情页和前端交互

**Files:**
- Create: `app/web/pages/agents/index.tsx`
- Create: `app/web/pages/agents/types.ts`
- Create: `app/web/pages/agents/style.scss`
- Create: `app/web/pages/agents/detail/index.tsx`
- Create: `app/web/pages/agents/detail/AgentDetailContent.tsx`
- Create: `app/web/pages/agents/detail/style.scss`
- Modify: `app/web/router/index.ts`
- Modify: `app/web/layouts/header/header.tsx`
- Modify: `app/web/layouts/basicLayout/index.tsx`
- Modify: `app/web/api/url.ts`

**Interfaces:**
- Consumes: `/api/agents/list`、`/api/agents/detail`、`/api/agents/related`、`/api/agents/import-file`、`/api/agents/delete`
- Produces:
  - `/page/agents`
  - `/page/agents/:name`
  - `API.getAgentList / getAgentDetail / getRelatedAgents / importAgentFile / deleteAgent`

- [ ] **Step 1: 先写前端契约测试或最小类型约束**

```ts
export interface AgentItem {
    name: string;
    displayName: string;
    logoUrl: string;
}
```

- [ ] **Step 2: 运行类型或构建校验，确认新页面尚未接入**

Run: `npm run check-types`
Expected: FAIL，提示 `Cannot find module '@/pages/agents'` 或 API 类型缺失

- [ ] **Step 3: 最小实现列表页和详情页**

```tsx
<Tabs defaultActiveKey="overview">
    <TabPane tab="概览" key="overview" />
    <TabPane tab="Agent 简介" key="profile" />
    <TabPane tab="Agent 能力" key="skills" />
</Tabs>
```

- [ ] **Step 4: 接入导入弹窗、删除、相关 Agent 和按钮提示**

```tsx
<Button onClick={() => message.info('安装')}>安装</Button>
<Button type="primary" onClick={() => message.info('使用')}>使用</Button>
```

- [ ] **Step 5: 运行前端校验确认通过**

Run: `npm run check-types`
Expected: PASS

### Task 4: 补控制器集成测试与最终验证

**Files:**
- Create: `test/agent-market-controller.test.js`
- Modify: `test/agent-market-service.test.js`
- Modify: `docs/superpowers/specs/2026-08-11-agent-market-design.md`

**Interfaces:**
- Consumes: `app/controller/agents.js`、`app/service/agents.js`
- Produces: 可回归的 Agent 市场后端测试集合

- [ ] **Step 1: 给控制器路由契约写失败测试**

```js
test('Agent detail controller 返回统一 response 包装', async () => {
    const controller = buildAgentsController({ getAgentDetail: async () => ({ name: 'bugfix-agent' }) });
    await controller.getAgentDetail();
    assert.equal(controller.ctx.body.success, true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/agent-market-controller.test.js test/agent-market-service.test.js`
Expected: FAIL，提示缺少 `app/controller/agents`

- [ ] **Step 3: 完成控制器测试支撑并收口文档**

```js
ctx.body = app.utils.response(true, data);
```

- [ ] **Step 4: 运行完整验证**

Run: `node --test test/agent-market-controller.test.js test/agent-market-service.test.js`
Expected: PASS

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 5: 提交最终实现**

```bash
git add app/controller/agents.js app/service/agents.js app/web/pages/agents app/web/router/index.ts app/web/layouts/header/header.tsx app/web/layouts/basicLayout/index.tsx app/web/api/url.ts test/agent-market-controller.test.js test/agent-market-service.test.js docs/superpowers/plans/2026-08-11-agent-market.md
git commit -m "feat: implement agent market"
```
