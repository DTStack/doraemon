# Agent 市场设计

## 1. 背景与目标

Doraemon 新增 Agent 市场，用于展示、搜索、导入和更新 Agent。Doraemon 负责 Agent 的市场展示和安装包存储，不负责在线运行；Agent 最终由 Codex 等宿主执行。

第一版目标：

- 提供 Agent 列表页和详情页
- 通过 ZIP 导入单个 Agent
- 从 `agent.yaml` 提取市场展示字段
- 保存 Agent 完整文件快照，为后续安装能力保留基础
- 展示核心工作流和依赖 Skills
- 根据公共依赖 Skills 推荐相关 Agent

第一版不包含：

- Git 仓库自动同步
- Agent 在线运行
- Agent 安装和使用的真实功能
- Stars、下载量、收藏和版本历史
- 多 Agent ZIP 导入

## 2. 数据来源

正式运行时，Agent 列表和详情从数据库读取。Logo、Demo 等资源的元数据和相对路径从数据库读取，图片二进制从服务器持久化目录读取，不存入数据库。`agent-market` 本地目录不作为生产数据源，也不依赖相邻目录挂载。

开发环境如需直接预览本地资源，只能在 `config.local.js` 配置静态目录，不能将本机路径写入 `config.default.js`。

第一版按单机部署设计，生产资源根目录默认为 `/data/doraemon/agent-market`，并允许通过配置项覆盖。该目录必须位于持久化磁盘，不随应用发布、重启或临时文件清理而删除。

## 3. Agent ZIP 契约

### 3.1 目录结构

一个 ZIP 只能包含一个 Agent，压缩包顶层为一个 Agent 目录：

```text
bugfix-agent/
├── assets/
│   ├── demo1.png
│   ├── demo2.png
│   └── logo.png
├── skills/
│   └── bugfix-workflow/
│       ├── agents/
│       ├── references/
│       ├── scripts/
│       ├── tests/
│       └── SKILL.md
├── subagents/
│   ├── bugfix-reviewer.toml
│   └── bugfix-worker.toml
├── agent.yaml
├── MIGRATION.md
├── README.md
└── setup.sh
```

导入器忽略 `.DS_Store` 和 `__MACOSX`。解压后必须且只能发现一个 `agent.yaml`，且该文件必须位于唯一顶层 Agent 目录的根部。

### 3.2 文件安全

导入时拒绝：

- 绝对路径、`../` 路径和路径穿越
- 软链接和其他特殊文件
- 重复路径和大小写冲突路径
- 超出限制的 ZIP、文件数量、解压体积或单文件

默认限制：ZIP 最大 50MB、解压后最大 200MB、最多 500 个文件、单文件最大 20MB、单张展示图片最大 5MB。

保存非 `assets/` 文件时记录相对路径、MIME、大小、编码、内容和 Unix mode。`setup.sh` 等可执行文件在重新构建安装包时必须恢复执行权限。

`assets/` 仅允许普通文件，Logo 和 Demo 第一版支持 PNG、JPEG 和 WebP。导入时根据文件签名校验实际类型，不能只信任扩展名或上传的 `Content-Type`。

## 4. Manifest 契约

### 4.1 必填字段

```yaml
apiVersion: doraemon.dtstack.com/v1
kind: Agent

metadata:
  name: bugfix-agent
  displayName: Bugfix Agent
  version: 1.0.0
  logo: ./assets/logo.png
  description: Agent 简短描述
  author:
    name: DTStack
  category: 工程效率
  tags:
    - Bugfix

spec:
  profile: Agent 详细简介
  entrypoint:
    host: codex
    type: skill
    name: bugfix-workflow
    ref: ./skills/bugfix-workflow
```

校验规则：

- `apiVersion` 第一版只接受 `doraemon.dtstack.com/v1`
- `kind` 必须为 `Agent`
- `metadata.name` 是不可变唯一标识，只允许小写字母、数字和连字符，最大 100 字符
- `metadata.version` 必须是 SemVer
- `metadata.category` 复用 Skills 分类：`通用`、`前端`、`后端`、`数据与AI`、`运维与系统`、`工程效率`、`安全`、`其他`
- 已声明的 Logo、Demo、入口 Skill 和 SubAgent 相对路径必须存在于 ZIP 中
- 未识别的扩展字段不写入结构化列，但会随完整 `agent.yaml` 保存在 `agent_files` 中，不影响当前版本解析

### 4.2 页面字段映射

| Manifest 字段 | 用途 |
| --- | --- |
| `metadata.name` | 唯一标识、详情路由、更新匹配 |
| `metadata.displayName` | Agent 展示名称 |
| `metadata.version` | 当前版本 |
| `metadata.logo` | 列表和详情 Logo |
| `metadata.description` | 列表摘要和详情头部摘要 |
| `metadata.author.name` | 作者 |
| `metadata.category` | 单一分类 |
| `metadata.tags` | 多个检索和展示标签 |
| `spec.profile` | Agent 简介 |
| `spec.prompts` | 概览示例问题 |
| `spec.capabilities` | 概览中的“可以做什么” |
| `spec.entrypoint` | Agent 能力中的核心工作流 |
| `spec.dependencies.skills` | Agent 能力中的依赖 Skills、相关推荐依据 |
| `spec.demo.images` | 概览 Demo 图片和替代文本 |

`spec.agents` 属于运行内部结构，第一版不在详情页单独展示。

### 4.3 Bugfix Agent 示例问题

```yaml
prompts:
  - title: 修复 Bug 并部署 OMP online 环境
    prompt: "$bugfix-workflow 156343 dataApi 6.0.x，使用来源分支 dataApi/release_6.0.x，并部署到匹配的 OMP online 环境"
  - title: 仅分析 Bug
    prompt: "分析 Bug 156372，应用 batch，版本 6.2.x，只做根因分析，先不要修改代码"
  - title: 指定 hotfix 与负责人
    prompt: "$bugfix-workflow 156460 stream 6.2.x hotfix zhaoge"
```

## 5. 数据模型

采用独立的 Agent 数据模型，不重构现有 Skills。

### 5.1 `agents`

保存可查询的结构化字段：

- `id`
- `name`，唯一索引
- `display_name`
- `version`
- `description`
- `profile`，LONGTEXT
- `author_name`
- `category`
- `tags`，JSON 字符串
- `prompts`，JSON 字符串
- `capabilities`，JSON 字符串
- `demo_images`，JSON 字符串，保存资源相对路径、MIME、大小、hash、alt 和顺序
- `entrypoint_host`
- `entrypoint_type`
- `entrypoint_name`
- `entrypoint_ref`
- `logo_path`，保存资源相对路径
- `logo_mime_type`
- `logo_size`
- `logo_hash`
- `content_hash`
- `source_file_name`
- `file_count`
- `is_delete`
- `created_at`、`updated_at`

### 5.2 `agent_files`

保存 Agent 除 `assets/` 外的完整文件快照：

- `id`
- `agent_id`
- `file_path`
- `mime_type`
- `size`
- `is_binary`
- `encoding`，文本使用 `utf8`，二进制使用 `base64`
- `mode`，保存 Unix 文件权限
- `content`，LONGTEXT
- `is_delete`
- `created_at`、`updated_at`

`agent_id + file_path` 建立唯一索引。`assets/` 下的图片二进制不写入 `agent_files`，对应索引由 `agents.logo_*` 和 `agents.demo_images` 保存。

### 5.3 `agent_skills`

保存核心工作流和公共 Skill 关系：

- `id`
- `agent_id`
- `skill_slug`
- `skill_id`，允许为空
- `relation_type`，`entrypoint` 或 `dependency`
- `sort_order`
- `created_at`、`updated_at`

公共 Skill 尚未收录时仍保存 `skill_slug`。详情查询时按 slug 动态解析，后续 Skill 导入后无需重新导入 Agent。

### 5.4 Agent 资源目录

资源根目录由 `config.agentMarket.storageDir` 控制，生产环境配置为：

```text
/data/doraemon/agent-market/
└── <agent-name>/
    └── <content-hash>/
        └── assets/
            ├── logo.png
            ├── demo1.png
            └── demo2.png
```

数据库只保存相对于资源根目录的路径，例如 `bugfix-agent/<content-hash>/assets/logo.png`，不保存绝对路径。`content-hash` 进入路径，用于避免同版本覆盖后的浏览器缓存污染，并支持新旧资源目录原子切换。

资源不能写入 `cache/uploads`，该目录只用于上传和解压过程中的临时文件。资源也不能直接读取相邻的 `../agent-market` 源目录。

## 6. 导入、更新与删除

### 6.1 导入流程

1. 接收一个 ZIP，并写入上传临时目录
2. 安全解压到临时目录
3. 校验单 Agent 目录结构和 `agent.yaml`
4. 校验所有 Manifest 文件引用
5. 读取全部文件和权限，计算 `content_hash`
6. 按 `metadata.name` 查询现有 Agent
7. 新 Agent 直接创建；已有 Agent 进入更新规则
8. 将 `assets/` 写入资源根目录下的临时目录，校验完成后原子重命名为 `<agent-name>/<content-hash>/assets`
9. 在一个数据库事务中写入 Agent、非资源文件和 Skill 关系，并将资源相对路径指向新目录
10. 数据库事务失败时删除本次新增资源目录；事务成功后删除该 Agent 的旧 hash 资源目录
11. 成功或失败后删除上传 ZIP 和解压目录
12. 清理 Agent 列表缓存并返回导入结果

### 6.2 更新规则

- 相同版本允许覆盖
- 高版本允许升级
- 低版本禁止覆盖高版本
- `content_hash` 相同则返回“内容未变化”，不重复写入
- 新 ZIP 是完整快照，新包不存在的旧文件和旧关系必须删除
- 更新失败时旧版本保持不变
- 第一版只保存当前版本，不保留版本历史

更新前端采用重新上传 ZIP，不提供直接修改数据库字段的编辑表单。首次检测到同名 Agent 时返回更新摘要并请求用户确认，确认后再次提交覆盖请求。

### 6.3 删除规则

删除时将 `agents.is_delete` 设置为 `1`，并物理删除对应的 `agent_files`、`agent_skills` 和服务器资源目录。不得删除任何 Skill 市场记录。重新导入相同 `metadata.name` 时恢复 Agent，并使用新 ZIP 重建文件、资源和关系。

数据库删除成功但资源目录清理失败时记录错误并进入后续清理，不回滚数据库删除结果。资源目录只能根据数据库中已校验的 Agent 名称和 hash 计算，禁止接受客户端传入的任意物理路径。

## 7. API 设计

第一版提供：

- `GET /api/agents/list`：关键词、分类、分页查询
- `GET /api/agents/detail`：Agent 详情、核心工作流、依赖 Skills
- `GET /api/agents/related`：相关 Agent
- `GET /api/agents/asset`：返回 Logo 或 Demo 二进制资源
- `POST /api/agents/import-file`：导入或确认覆盖 Agent ZIP
- `POST /api/agents/delete`：软删除 Agent

资源接口根据数据库记录定位资源相对路径，校验解析后的绝对路径仍位于资源根目录内，再以文件流返回。接口根据已保存 MIME 返回正确 `Content-Type`，并对带 hash 的资源设置长期缓存头。列表和详情接口只返回资源 URL，不内嵌 Base64，也不返回服务器绝对路径。

## 8. 列表页

导航栏在 `Skills` 相邻位置增加 `Agents`，路由为 `/page/agents`。

列表页沿用 Skill 市场的视觉语言：

- 标题“Agent 市场”
- 副标题“发现并导入适用于不同研发场景的 Agent”
- 搜索名称、描述、标签和作者
- 分类筛选复用 Skills 分类
- 三列响应式卡片，移动端单列
- 卡片展示 Logo、名称、描述、分类、最多三个标签、版本、作者、更新时间和依赖 Skill 数量
- 默认按更新时间倒序
- API 保留分页，当前总数不超过一页时不展示分页器
- 不展示 Stars、下载量、收藏、多选、复制命令和排序器
- 提供“导入 Agent”按钮
- 更新入口只允许重新上传 ZIP，删除行为与 Skill 市场一致

## 9. 详情页

详情页路由为 `/page/agents/:name`，沿用 LobeHub 的信息层级，但保持 Doraemon 的现有视觉语言。

### 9.1 顶部区域

展示 Logo、名称、作者、版本、分类和标签。右侧提供“安装”和“使用”按钮；第一版点击后分别执行 `message.info('安装')` 和 `message.info('使用')`。

### 9.2 页签

详情页包含三个页签：

- 概览
- Agent 简介
- Agent 能力

默认打开概览，页签状态不写入 URL。

### 9.3 概览

概览展示：

- `metadata.description`
- `spec.capabilities` 能力卡片
- `spec.prompts` 三个示例问题
- `spec.demo.images` Demo 图片

Demo 图片按内容区宽度 `width: 100%` 展示，高度自适应，图片间距 16px，不使用轮播、缩略图或灯箱。

### 9.4 Agent 简介

渲染数据库中的 `profile` 字段，不直接读取或渲染 README。第一版按纯文本段落和换行展示，不启用任意 HTML。

### 9.5 Agent 能力

分为：

- 核心工作流：展示 `spec.entrypoint` 对应的一个入口 Skill
- 依赖 Skills：按 `spec.dependencies.skills` 顺序展示公共 Skill

已收录 Skill 可跳转 Skills 详情页；未收录 Skill 显示“暂未收录”，不提供跳转。

### 9.6 相关 Agent

右侧最多展示三个相关 Agent。仅使用公共依赖 Skills 计算，不使用入口 Skill：

1. 排除当前 Agent
2. 计算公共依赖 Skill 交集数量
3. 过滤交集为 0 的 Agent
4. 按交集数量倒序
5. 同分按更新时间倒序

没有结果时隐藏整个模块。移动端将操作按钮和相关 Agent 移到正文下方。

## 10. 异常与空状态

- Agent 不存在或已删除：展示空状态并返回 Agent 列表
- Logo 缺失或加载失败：使用统一默认 Agent 图标
- 单张 Demo 加载失败：保留位置并显示“图片加载失败”，其他图片继续展示
- 依赖 Skill 未收录：展示不可跳转的缺失状态，不阻止 Agent 导入
- ZIP 或 Manifest 校验失败：一次返回明确错误，不写入任何 Agent 数据
- 低版本覆盖：返回当前版本和导入版本
- 相同内容：返回“内容未变化”

## 11. 测试与验收

后端测试至少覆盖：

- 正常单 Agent ZIP 导入
- 多 Agent、无 Agent、路径穿越、软链接和超限 ZIP 拒绝
- Manifest 必填字段、分类、SemVer 和文件引用校验
- 新增、同版本覆盖、高版本升级、低版本拒绝
- 完整快照删除旧文件
- 导入失败事务回滚
- 非资源文件内容和 mode 保存
- Logo、Demo 写入持久化目录，数据库不保存图片二进制
- 资源路径穿越、伪造图片类型和超限图片拒绝
- 覆盖成功切换新 hash 目录并清理旧目录
- 数据库事务失败时清理本次新增资源目录
- 缺失公共 Skill 仍可导入
- 相关 Agent 交集排序和无结果隐藏
- 删除 Agent 不影响 Skills

前端验收至少覆盖：

- 列表搜索、分类、空状态和响应式布局
- 导入新增、覆盖确认、错误提示和内容未变化
- 三个详情页签内容映射正确
- Demo 图片宽度、高度和 16px 间距正确
- 已收录与未收录 Skill 状态正确
- 相关 Agent 排序、跳转和移动端布局正确
- “安装”“使用”按钮弹出对应名称

## 12. 已确认决策

- 使用独立 `agents + agent_files + agent_skills`，不重构 Skills
- 一个 ZIP 只允许一个 Agent
- ZIP 顶层为单一 Agent 目录，`agent.yaml` 位于该目录根部
- 仅手动 ZIP 导入，不做目录导入和自动同步
- 相同版本覆盖，低版本禁止覆盖
- 更新按完整快照处理
- 不保留版本历史
- 删除 Agent 不影响 Skills
- 分类复用 Skills，Tags 独立保存
- 数据库是列表、详情和资源索引的正式数据源
- Logo、Demo 图片保存在单机持久化目录 `/data/doraemon/agent-market`，数据库不保存图片二进制
- Demo 原图顺序纵向展示，宽度撑满，高度自适应，间距 16px
- 详情页只渲染数据库字段，不直接渲染源文件
- 第一版按钮只弹出按钮名称
