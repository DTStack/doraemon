# Agent 市场

Agent 市场是 Doraemon 提供的 Agent Registry 与管理中心，**以 Codex 与 Claude Code 双宿主原生 Plugin 的形式统一分发**和管理面向复杂研发场景的 Agent 插件。

Doraemon 并不定义私有的 Agent 运行时协议，而是全面兼容主流 AI 编码环境（OpenAI Codex 与 Anthropic Claude Code）的官方 Plugin 规范，并采用 **GitOps 驱动** 的模式进行版本追踪与全生命周期管理：

- **GitOps 驱动的插件源**：每个 Agent 的代码与元数据均托管在独立的 GitLab 仓库中，由 Doraemon 服务端通过 Git 操作进行拉取、解析、版本校验与归档分发。
- **以 Plugin 形式分发**：上架的每个 Agent 均是一个标准的双宿主 Plugin，包含了各自所需的 Manifest 清单与自包含的 Skills 依赖。
- **轻量高效的归档存储**：服务端利用 Git 提交 Hash 进行精确版本追踪，并通过 `git archive` 实时生成标准的插件 ZIP 包，充当企业私有 Plugin Registry，提供终端一键安装脚本及离线 ZIP 下载。
- **Web 展示与全生命周期管理**：在 Web 页面中检索 Agent 列表、查看详情与关联 Skills，支持一键全量同步或单个 Agent 增量同步，支持在页面直接配置远端 Git 仓库。
- **宿主快捷使用**：在 Agent 详情页中，通过“快捷使用”入口直接唤起 Codex 新会话，并把选中的开场问题和上下文预填到输入框中。

> [!NOTE]
> Doraemon 不负责在服务端在线执行 Agent。Agent 的实际运行由使用方本地的 Codex 或 Claude Code 等宿主环境完成，Doraemon 作为私有 Marketplace 负责其展示与分发。

## 入口与页面结构

- Agent 列表页：`/page/agents`
- Agent 详情页：`/page/agents/<agent-name>`

### 列表页功能

![agent-list.png](../../imgs/agent-list.png)

列表页提供便捷的检索、筛选与 GitOps 快捷操作：

- **搜索与分类过滤**：支持按名称、描述、作者或关键词过滤检索 Agent，支持按分类（如“工程效率”、“通用”等）快速筛选。
- **全量同步（GitOps）**：页面右上角提供【全量同步】按钮，可一键向远端 GitLab 批量拉取所有已配置仓库的 Agent 最新代码。
- **导入 Agent**：点击【导入 Agent】按钮打开 GitOps 导入弹窗，输入 GitLab 仓库地址、分支及分类即可自动导入入库。
- **Agent 卡片信息**：
  - 展示 Agent Logo（若未配置或加载失败，系统自动回退显示默认头像）、显示名称、作者、版本号、所属分类、功能描述及关键词 Tags。
  - 展示包含技能数量（`X 个技能`）。
  - 卡片右上角操作：针对已配置 Git 仓库的 Agent，提供【从 Git 同步最新代码】按钮，支持单独对该 Agent 触发即时代码同步。

### 详情页结构

![agent-detail.png](../../imgs/agent-detail.png)

详情页采用单页纵向流式布局与侧边栏结构：

- **顶部 Hero 区域**：展示 Agent Logo、显示名称、作者、版本、分类、能力项列表（capabilities，逗号分隔）及关键词 Tags。
- **左侧主体区域**：
  - **功能概览**：展示 Agent 的核心定位与用途说明（对应 manifest 的 `description`）。
  - **Agent 简介与快速使用（Codex）**：正文长描述段落（`longDescription`），以及开场问题列表（支持一键在 Codex 中“快捷使用”）。
  - **Skills 模块**：自动解析自包内 `skills/` 的关联技能网格卡片，展示技能名称、描述以及 Skills Hub 收录状态（收录项可点击直接跳转至 Skills Hub 详情页）。
- **右侧边栏区域**：
  - **安装命令**：终端样式的安装脚本调用命令，支持一键复制。
  - **下载 Agent ZIP**：支持直接下载由服务端 `git archive` 打包生成的当前版本原始插件 ZIP 包。
  - **Git 仓库设置**（GitOps 管理）：
    - 提供【从 Git 同步最新代码】快捷同步按钮。
    - 展示【最近刷新时间】（最近一次向 GitLab 发起检查确认是否有新提交的时间）与【最近同步代码时间】（最近一次拉取到新提交并入库生效的时间）。
    - 点击右上角设置图标（齿轮）可打开弹窗调整当前 Agent 的 GitLab 仓库地址、拉取分支及分类。
  - **相关 Agent 推荐**：基于共同技能重叠度自动计算并智能推荐相关 Agent。

## 快速使用

### 复制安装命令与 Plugin 分发机制

Agent 市场中的 Agent 是**以 Codex 和 Claude Code 原生 Plugin 的形式进行分发与安装的**。详情页右侧会根据当前站点地址自动生成一键安装命令：

```bash
curl -fsSL http://127.0.0.1:7001/agent-market/install.sh | bash -s -- bugfix-agent
```

#### 一键安装的底层分发逻辑

当使用者在终端执行该命令时，安装脚本 `install.sh` 会自动完成以下操作：

1. **下载源码归档**：从 Doraemon 服务端接口 `/api/agents/download?name=<agent-name>` 下载当前版本的源码 ZIP 归档，并解压至临时目录。
2. **部署至本地 Marketplace 目录**：将解压后的 Agent 移动至本地集中目录 `~/.agents/agent-market/agents/<agent-name>`。
3. **动态维护本地双端 Marketplace**：
   - 自动在 `~/.agents/agent-market/.codex-plugin/marketplace.json` 与 `~/.agents/agent-market/.claude-plugin/marketplace.json` 中增量维护或更新该 Agent 插件条目。
4. **探测本地宿主 CLI**：
   - 自动探测系统环境中是否存在 `codex`（包括 PATH 中的独立 CLI，以及 macOS 桌面应用内置路径 `/Applications/ChatGPT.app/Contents/Resources/codex`）。
   - 自动探测系统环境中是否存在 `claude`（Claude Code CLI）。
5. **注册本地 Marketplace 源**：
   - Codex：自动执行 `codex plugin marketplace add ~/.agents/agent-market`
   - Claude Code：自动执行 `claude plugin marketplace add ~/.agents/agent-market`
6. **作为 Plugin 原生安装**：
   - 在 Codex 中安装：`codex plugin add <agent-name>@agent-market`
   - 在 Claude Code 中安装：`claude plugin install <agent-name>@agent-market [--yes]`（自动探测 `--yes` 支持度，非交互终端下自动跳过确认）
7. **执行环境预检**：
   - 若 Agent 根目录下自带 `setup.sh` 脚本，安装器会自动运行该脚本探测运行时依赖的工具与环境变量，并在终端输出清晰的【环境检查结论】报告。
8. **输出调用指引**：
   - 自动解析 Manifest 中声明的入口 Skill，并在安装末尾打印出双端对应的调用命令，如：
     - Codex：`$bugfix-workflow`
     - Claude Code：`/bugfix-agent:bugfix-workflow`

#### 环境变量自定义

执行安装脚本时，支持通过环境变量自定义参数：

```bash
# 覆盖服务端地址（默认根据当前站点生成）
export AGENT_MARKET_BASE_URL="http://172.16.100.225:7001/agent-market"

# 覆盖本地 Marketplace 存放目录（默认: ~/.agents/agent-market）
export AGENT_MARKET_LOCAL_DIR="$HOME/.agents/agent-market"

# 覆盖 Marketplace 名称（默认: agent-market）
export AGENT_MARKET_NAME="agent-market"
```

#### 手动 Plugin 安装方式

由于分发产物遵循官方 Plugin 规范，使用者也可以直接通过宿主原生命令手动管理：

```bash
# 1. 注册本地 agent-market 源（初次使用）
codex plugin marketplace add ~/.agents/agent-market
claude plugin marketplace add ~/.agents/agent-market

# 2. 安装指定的 Agent 插件
codex plugin add bugfix-agent@agent-market
claude plugin install bugfix-agent@agent-market
```

### 插件卸载（Uninstall）

如果不再需要某个 Agent 插件，推荐直接使用对应宿主的原生 Plugin 命令从本地环境中移除：

#### 1. 使用宿主官方命令卸载

```bash
# 从 Codex 中移除插件
codex plugin remove <agent-name>@agent-market

# 从 Claude Code 中卸载插件
claude plugin uninstall <agent-name>@agent-market
```

#### 2. （可选）清理本地源码与缓存

若希望彻底清理本地由安装脚本同步的 Agent 源码快照与宿主缓存，可手动执行：

```bash
# 移除本地 marketplace 中的该 Agent 源码目录
rm -rf ~/.agents/agent-market/agents/<agent-name>

# 移除宿主本地插件缓存
rm -rf ~/.codex/plugins/cache/agent-market/<agent-name>
rm -rf ~/.claude/plugins/cache/agent-market/<agent-name>
```

> [!TIP]
> 默认情况下无需移除 `agent-market` 的源注册，以便后续安装或更新其他 Agent。若彻底不再使用本平台的所有插件，可执行 `codex plugin marketplace remove agent-market` 或 `claude plugin marketplace remove agent-market`。

### 下载 Agent ZIP

详情页右侧“安装命令”卡片右上角提供下载图标（hover 提示“下载 Agent ZIP”），支持直接下载当前 Agent 由服务端通过 `git archive` 原生生成的完整插件 ZIP 归档。

适合以下场景：
- 本地离线检查 Agent 插件包内部结构与实现代码。
- 离线环境下分发与手动解压安装。
- 作为模板参考已有插件的规范组织方式。

### 直接在 Codex 中快捷使用

在 Agent 详情页的“快速使用（Codex）”区域中，每个开场问题右侧均提供“快捷使用”按钮。

点击后会：
1. 打开本地 Codex 并创建新任务会话。
2. 自动带入当前 Agent 的上下文信息。
3. 自动把选中的推荐指令预填到输入框中。

## GitOps 导入与代码同步

Doraemon 采用 GitOps 模式管理 Agent 插件，实现代码集中在 GitLab 托管、平台自动追踪同步。

### 1. 导入 Agent（GitLab）

在列表页点击【导入 Agent】，弹窗支持配置以下信息：

- **GitLab 仓库地址**：
  - 支持标准的 Git 仓库 URL，例如：`http://gitlab.prod.dtstack.cn/ai-agents/bugfix-agent.git`
  - **智能 URL 兼容**：支持直接粘贴 GitLab 网页端的查看分支或文件链接（例如 `http://gitlab.prod.dtstack.cn/ai-agents/bugfix-agent/-/tree/dev`），系统会自动剥离后缀提取纯净仓库地址，并智能提取链接中的目标分支。
- **Git 分支**：拉取的目标分支，默认为 `master`。
- **分类**：设置所属分类（通用、前端、后端、数据与AI、运维与系统、工程效率、安全、其他）。

### 2. 代码同步机制

> [!NOTE]
> **自动更新周期说明**：
> 系统默认配置了**后台定时自动同步任务（默认每 5 分钟轮询一次）**。远端 GitLab 仓库合入新代码后，后台会在周期触发时自动拉取更新并使新版本生效。若希望代码变动即时生效，可使用页面按钮或 CI/CD API 手动触发即时同步。

代码同步支持以下触发方式：

- **后台定时自动同步**：服务端默认每 5 分钟自动执行一次全量检查与增量同步（可通过服务端配置 `autoSyncInterval` 调整周期或关闭）。
- **单个 Agent 手动同步**：在列表页卡片右上角点击【从 Git 同步最新代码】，或在详情页侧边栏点击【从 Git 同步最新代码】按钮。
- **全量批量手动同步**：在列表页顶部点击【全量同步】按钮，后台将按序批量同步所有配置了 Git 仓库的 Agent。
- **配置修改并即时同步**：在详情页【Git 仓库设置】弹窗中修改分支或仓库地址后，可选择保存并立即同步。
- **CI/CD 流水线自动触发（推荐）**：支持在 GitLab CI/CD 或自动化部署脚本中通过 API 触发指定 Agent 的即时同步：
  ```bash
  # 触发指定 Agent 同步
  curl -X POST http://127.0.0.1:7001/api/agents/sync-git \
       -H "Content-Type: application/json" \
       -d '{"name": "bugfix-agent"}'
  ```

#### 服务端同步底层处理流程

1. **并发同步保护**：系统维护基于仓库名的并发锁（Active Sync Lock），防止多用户并发触发导致本地仓库产生 `index.lock` 竞争冲突。
2. **高效克隆与拉取**：
   - 首次导入时，在服务端存储目录（`storageDir/git_repos/<repoName>`）执行 `git clone --depth 1 --branch <branch> <gitUrl>` 浅克隆。
   - 后续同步时，执行 `git fetch --all` 与 `git reset --hard origin/<branch>`。若遇到损坏或远端历史改写，会自动安全回退并重新浅克隆。
3. **双 Manifest 契约校验**：
   - 检查根目录下 `.codex-plugin/plugin.json` 与 `.claude-plugin/plugin.json` 是否齐全。
   - 校验 Manifest 中的 `name` 必须与 GitLab 仓库名（去除 `.git` 后缀）完全一致。
   - 校验两个 Manifest 中的 `version` 核心版本号必须完全一致。
   - 校验 `skills` 声明的目录及 Claude `agents` 引用的角色文件真实存在。
4. **精确版本追踪（Content Hash）**：
   - 执行 `git rev-parse HEAD` 获取当前分支最新提交的 Commit SHA 作为 `content_hash`。
   - 数据库分别维护：
     - **最近刷新时间（last_git_refresh_at）**：每一次向 GitLab 发起探测和拉取的时间。
     - **最近同步代码时间（last_git_sync_at）**：仅当检测到新提交（Commit Hash 发生变化）并完成更新时刷新的时间。
5. **归档生成与缓存轮转**：
   - 使用原生命令 `git archive --format=zip --prefix=<name>/ HEAD -o <archivePath>` 实时打出标准 ZIP 归档文件，放置于缓存目录供下载及 `install.sh` 分发。
   - 自动清理旧提交 Hash 产生的历史归档目录，防止磁盘膨胀。
6. **技能关联与 Logo 提取**：
   - 自动扫描 `skills/` 目录下的所有 `SKILL.md`（兼容大小写文件名），同步至 `agent_skills` 关系表。
   - 提取并缓存 Logo 资源。

### 3. Git 仓库设置修改

在 Agent 详情页右侧边栏的【Git 仓库设置】卡片中，点击齿轮设置图标可打开配置弹窗：

- 可以随时修改 GitLab 仓库地址、拉取分支及所属分类。
- 支持在保存时选择是否立即执行代码同步。

## 插件开发与脚手架工具

为了降低双端原生 Plugin 的开发门槛，Doraemon 提供了快速脚手架脚本 `create-plugin.sh`，可一键生成规范工程。

### 一键创建 Plugin 骨架

在终端运行以下命令：

```bash
# 格式: curl -fsSL http://127.0.0.1:7001/agent-market/create-plugin.sh | bash -s -- <plugin-name> [目标目录]
curl -fsSL http://127.0.0.1:7001/agent-market/create-plugin.sh | bash -s -- my-agent ./
```

脚本将自动执行以下操作：
1. 规范化命名：自动将插件名转换为符合规范的 kebab-case 格式。
2. 生成双 Manifest 模板：自动生成预置详细字段注释的 `.claude-plugin/plugin.json` 与 `.codex-plugin/plugin.json`。
3. 生成示例角色：生成 Claude 角色（`agents/claude/my-agent-assistant.md`）与 Codex 角色（`agents/my-agent-assistant.toml`）。
4. 生成示例技能：生成 `skills/demo/SKILL.md` 骨架。
5. 生成 Hook 与 MCP 配置模板：生成 `hooks/claude-hooks.json`、`hooks/codex-hooks.json` 与 `.mcp.json`。
6. 生成规范说明文档：生成规范的 `README.md` 与 `assets/` 图标目录。

> [!TIP]
> 脚手架生成的 `plugin.json` 带有方便对照填写的注释（JSONC 格式）。在提交发布到 GitLab 前，请将注释移除转换为标准严格 JSON，并可通过 `claude plugin validate .` 进行格式验证。

## Agent 仓库目录约定

托管在 GitLab 上的 Agent 仓库遵循统一的双宿主插件标准布局。以典型 Agent `bugfix-agent` 为例，标准的目录结构如下：

```text
bugfix-agent
├── .codex-plugin/
│   └── plugin.json                # Codex manifest 与 Doraemon 详情元数据
├── .claude-plugin/
│   └── plugin.json                # Claude Code 插件 manifest
├── assets/
│   └── logo.png                   # Agent Logo 图标（可选）
├── skills/                        # 包含的 Skills（随包快照分发，自包含）
│   ├── bugfix-workflow/           # 核心入口工作流 Skill
│   │   ├── SKILL.md
│   │   ├── references/
│   │   └── scripts/
│   └── zentao-api/                # 依赖的公共或基础 Skill
│       └── SKILL.md
├── agents/                        # 角色契约定义（双宿主角色）
│   ├── bugfix-worker.toml         # Codex 角色配置
│   ├── bugfix-reviewer.toml       # Codex 审校角色配置
│   └── claude/
│       ├── bugfix-worker.md       # Claude Code 角色定义
│       └── bugfix-reviewer.md     # Claude Code 审校角色定义
├── setup.sh                       # 安装前环境预检脚本（由 install.sh 调用）
├── README.md                      # Agent 使用说明
└── LICENSE                        # 开源或授权协议
```

### 目录与文件职责说明

- **`.codex-plugin/plugin.json`**：插件核心清单文件，定义插件名称、版本、关联技能目录，并在 `interface` 节点中提供 Doraemon 页面展示所需的元数据。
- **`.claude-plugin/plugin.json`**：Claude Code 规范清单，声明插件名称并在 `agents` 中列出对应的 Claude 角色定义文件。
- **`skills/`**：包含 Agent 的入口工作流技能以及所依赖的所有技能。所有依赖技能作为快照存放在 `skills/` 随仓库统一分发，确保插件在离线或独立环境下自包含可用。
- **`agents/`**：定义具体的子角色（Subagents）。包括 Codex 格式（`*.toml`）与 Claude Code 格式（`claude/*.md`）的双宿主角色契约。
- **`setup.sh`**：安装前预检脚本。供 `install.sh` 在客户端安装时探测宿主机的基础工具与环境变量；它不是插件运行时钩子，仅在安装阶段执行。
- **`assets/logo.png`**：插件展示图标，推荐 256x256 正方形图片（支持 PNG、JPEG、WebP）。

## Manifest 规范要求

仓库根目录下必须同时维护两份 Manifest 清单，严禁声明 `tools` 或 `model` 字段（角色能力完全通过 Skill 调用与角色契约表达）。

### 1. `.codex-plugin/plugin.json`

该文件是 Codex 插件清单，同时也是 Doraemon 解析和展示 Agent 的核心元数据来源：

```json
{
  "name": "bugfix-agent",
  "version": "1.0.2",
  "description": "自动化根因分析、最小化代码修复、独立评审与 MR 交付的禅道 Bug 修复 Agent，可选 CI 追踪与 OMP 部署",
  "author": {
    "name": "琉易"
  },
  "keywords": ["bugfix", "bug", "zentao", "gitlab", "merge-request", "workflow", "code-review"],
  "skills": "./skills/",
  "interface": {
    "displayName": "Bugfix Agent",
    "longDescription": "Bug 修复流程：分析（根因 + 最小修复方案，不改代码）与实现（应用确认后的方案 + 本地验证），随后是独立的只读评审、两道人工确认关卡，以及 commit/MR/CI/OMP 交付。主线无需用户自定义 agent：插件在 agents/*.toml 下自带角色契约，由编排器按阶段读取。",
    "developerName": "琉易",
    "category": "Coding",
    "capabilities": ["Interactive", "Read", "Write"],
    "defaultPrompt": [
      "$bugfix-workflow 156343 dataApi/release_6.0.x OMP部署 全自动",
      "$bugfix-workflow 分析这个 Bug，但先不要修改代码",
      "$bugfix-workflow 推进后续步骤"
    ],
    "logo": "./assets/logo.png"
  }
}
```

#### 主要字段说明

| 字段路径 | 类型 | 是否必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 是 | 唯一标识，**必须与 GitLab 仓库名一致**（如 `bugfix-agent.git` 对应 `bugfix-agent`） |
| `version` | string | 是 | 语义化版本号（SemVer），与 Claude 清单版本一致 |
| `description` | string | 是 | 简短描述，用于列表卡片和详情页“功能概览” |
| `author.name` | string | 是 | 作者或团队名称（亦兼容 `interface.developerName`） |
| `keywords` | string[] | 否 | 关键词标签，用于搜索过滤与顶部 Hero 标签展示 |
| `skills` | string | 是 | 技能相对路径，必须为 `./` 开头（如 `./skills/`），仓库内必须真实存在 |
| `interface.displayName` | string | 是 | 详情页与列表页主标题显示名称 |
| `interface.longDescription` | string | 否 | 详情页“Agent 简介”展示的完整长描述，支持多段落 |
| `interface.category` | string | 否 | 分类标识（如 `Coding` 映射为 `工程效率`） |
| `interface.capabilities` | string[] / object[] | 否 | 能力项列表，在 Hero 区域作为功能项逗号分隔展示 |
| `interface.defaultPrompt` | string[] | 否 | 开场问题列表，最多 5 条，每条 ≤ 1024 字符（支持多行参数与代码块），提供“快捷使用”入口 |
| `interface.logo` | string | 否 | Logo 相对路径，如 `./assets/logo.png`；缺省时自动探测 `assets/` 下图片 |

### 2. `.claude-plugin/plugin.json`

该文件是 Claude Code 插件清单：

```json
{
  "name": "bugfix-agent",
  "version": "1.0.2",
  "description": "自动化根因分析、最小化代码修复、独立评审与 MR 交付的禅道 Bug 修复 Agent，可选 CI 追踪与 OMP 部署",
  "author": {
    "name": "琉易"
  },
  "agents": [
    "./agents/claude/bugfix-worker.md",
    "./agents/claude/bugfix-reviewer.md"
  ]
}
```

- `name`：必须与 `.codex-plugin/plugin.json` 的 `name` 严格保持一致。
- `agents`：必须声明角色定义文件相对路径列表，引用的文件在仓库内必须真实存在。

## 服务端配置说明

在服务端的 `config/config.default.js` 或根目录 `env.json` 中，可针对 Agent 市场进行如下配置：

```javascript
// config/config.default.js
exports.agentMarket = {
    // 仓库克隆与归档存储目录，可通过环境变量 AGENT_MARKET_STORAGE_DIR 自定义
    storageDir: process.env.AGENT_MARKET_STORAGE_DIR || '/data/doraemon/agent-market',
    // 私有 GitLab 访问 Token，可通过环境变量 GITLAB_TOKEN 或 env.json 中的 gitlabToken 配置
    gitlabToken: process.env.GITLAB_TOKEN || '',
    // 允许注入 Token 的 GitLab 域名白名单
    gitlabHostWhitelist: ['gitlab.prod.dtstack.cn'],
    // 仓库自动轮询定时同步间隔，可通过环境变量 AGENT_MARKET_AUTO_SYNC_INTERVAL 自定义，传空或 '0' 表示关闭
    autoSyncInterval: process.env.AGENT_MARKET_AUTO_SYNC_INTERVAL || '5m',
};
```

- **自动轮询同步**：`autoSyncInterval` 默认值为 `'5m'`（每 5 分钟执行一次全量轮询拉取）。当设置为 `''` 或 `'0'` 时可关闭定时轮询。
- **凭证安全**：当配置了 `gitlabToken` 时，服务端仅在克隆/拉取属于 `gitlabHostWhitelist` 白名单内的仓库时才会注入 Basic Auth 认证。在执行 Git 操作发生错误时，系统会自动将命令输出和报错中的 Token 及 Authorization 字段进行脱敏，避免凭证泄漏到前端或日志中。

## 与 Skills Hub 的关系

Agent 市场与 Skills Hub 是分层互补的能力体系：

- **Skills Hub**：管理和收录原子技能（Skill），专注于单个技能的能力定义、文档、脚本及工具封装。
- **Agent 市场**：管理面向复杂业务场景的复合插件单元（Agent），将入口工作流与多个专业依赖技能有机组合，配合多角色契约形成可独立分发的工程交付单元。

在 Agent 详情页中，系统会自动列出该 Agent 包含的所有技能，并实时联动 Skills Hub 标注收录状态，实现从整体解决方案到原子技能沉淀的双向贯通。
