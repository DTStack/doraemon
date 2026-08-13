# dt-skill 批量命令与 Codex 安装设计

## 目标

扩展 `dt-skill` 的上传、更新和安装能力：

- `upload` 一次接受多个 skill 路径
- `upload` 接受容器目录时，将一级 skill 子目录作为独立 skill 上传（保留现有 package 打包行为）
- `update` 一次接受多个已安装 skill 的 slug 或路径
- Codex 全局安装时在 `~/.codex/skills` 下提供可直接使用的 skill 入口

## 非目标

- 不新增 `upload-many` 或 `update-many` 命令
- 不递归扫描二级及更深层目录
- 不改变单路径容器目录的 package 打包行为（保留 `/api/skills/import-file`）
- 不改变无参数 `update` 表示更新全部已跟踪 skill 的行为
- 不改变 registry API、skill 内容格式或 lockfile schema

## 命令契约

### 批量上传

命令接受一个或多个路径：

```bash
npx dt-skill upload omp-skill zentao-api aaa/bbb-skill   # 多路径：逐个单 skill
npx dt-skill upload skills                                # 单路径容器目录：package 打包（现状）
npx dt-skill upload skills local/one-skill                # 多路径：容器目录也展开逐个
```

每个输入路径独立展开：

1. 路径自身包含 `SKILL.md` 或 `skill.md` 时，将其作为一个 skill
2. 否则只检查该目录的一级子目录，将包含 `SKILL.md` 或 `skill.md` 的子目录分别作为 skill
3. 忽略不符合 skill 结构的一级子目录
4. 按最终 slug 去重（`sanitizeSlug` 后），并按输入顺序、目录内 slug 顺序执行
5. 没有解析出任何 skill 时返回明确错误

执行模式按输入数量区分：

- **恰好一个路径且为容器目录**（路径自身不含 `SKILL.md`，一级子目录含）：走现有 `cmdPublishBatch`，ZIP 打包 + `/api/skills/import-file` 创建 package。交互式勾选**默认全部选中**（`--all` 跳过勾选直接全量）。这是对现状的唯一改动。
- **其他情况**（单个 skill 路径，或多个路径）：每个展开出的 skill 逐个走 `/api/v1/skills` 单 skill 发布链路，保留内容指纹、覆盖确认、分类、贡献者和嵌套文件路径等既有行为。

批量（逐个）执行时，一个 skill 失败不阻断后续 skill。命令结束时输出成功、未变化和失败汇总；只要存在失败，进程退出码为非零。`--category`、`--owner`、`--version`、`--changelog`、`--clawscan-note`、`--tags` 和 `--yes` 可共享给全部 skill。展开结果超过一个 skill 时，拒绝 `--slug`、`--name`、`--fork-of`、`--description` 和 `--migrate-owner`，避免把单 skill 身份或描述错误复用到多个 skill。

### 批量更新

命令接受零个、一个或多个 slug 或路径：

```bash
npx dt-skill update
npx dt-skill update omp-skill
npx dt-skill update omp-skill zentao-api aaa/bbb-skill
```

每个参数按以下规则解析为 slug：

- 含 `/` 或 `\` 的参数视为路径，slug 取 `sanitizeSlug(basename(resolve(arg)))`，与 publish 的 slug 推导一致
- 否则视为 slug，走 `normalizeSkillSlugOrFail`

- 无参数：保持现状，更新所选范围内全部已跟踪且未 pinned 的 skill
- 有参数：解析后按 slug 规范化并去重，只处理明确给出的 skill
- 多个参数共用一次 Project、Global 或 Both 范围选择
- `--all` 与任意显式参数互斥
- `--version` 只允许恰好一个显式参数
- 未安装、远端不存在、恶意内容、被 pinned 或下载失败都记录为该 skill 的失败或跳过，不阻断其他 skill
- 最终沿用统一 update summary；存在失败时返回非零退出码

### Codex 全局安装

现状存在分类 bug：`codex` 在 `agents/definitions.ts` 里 `skillsDir: '.agents/skills'`，导致 `isUniversalAgent` 将其判为 universal，`linkOrCopyToAgent` 对 universal 直接 skip，`~/.codex/skills` 软链接从不创建。交互式 agent 选择里 codex 被归入锁定区「Universal (.agents/skills)」，看不到 `~/.codex`。

目标行为：以下命令在 `~/.codex/skills/<slug>` 生成 Codex 可使用的入口：

```bash
npx dt-skill install omp-skill --global --agent codex
```

`~/.agents/skills/<slug>` 继续作为规范安装目录并持有 origin/lockfile 对应内容。Codex 全局入口是指向规范目录的软链接，使后续 `update` 原子替换规范目录后无需复制即可读取最新内容。

实现上修正 universal 判定或 codex 定义，使全局场景下 codex 走 symlink 逻辑指向 `~/.codex/skills`。注意 `cursor`、`gemini-cli`、`github-copilot`、`opencode` 等也是 `skillsDir: '.agents/skills'` + 独立 `globalSkillsDir` 的组合，存在同样的分类问题；若采用「全局且 `globalSkillsDir` 存在且不等于 canonical 目录时走 symlink」的判定修正，这些 agent 会一并获得正确的全局 symlink，属于预期修复，需在测试中覆盖并记录。

卸载全局 skill 时，同时清理 `~/.codex/skills/<slug>` 入口。项目范围安装仍沿用 `.agents/skills`，不额外创建项目内 `.codex/skills`。

## 代码结构

- `src/cli.ts`：把 `publish/upload` 改为可变路径参数，把 `update` 改为可选可变 slug/路径参数，并完成单 skill 参数约束
- `src/cli/commands/publish.ts`：增加多路径展开、去重、逐项发布；单 skill 发布逻辑保持独立可复用；保留 `cmdPublishBatch`（package 打包）并改为默认全选
- `src/cli/scanSkills.ts`：继续负责直接 skill 与一级 skill 子目录识别，不增加递归扫描
- `src/cli/commands/update.ts`：把单个可选 slug 改为显式参数集合（slug 或路径），并在一个 scope 中批量处理
- `src/cli/agents/definitions.ts` 与 `src/cli/installer.ts`：修正 codex 的 universal 判定，使全局安装走 symlink 到 `~/.codex/skills`
- `src/cli/commands/skills.ts`：卸载时按同一规则清理 Codex 全局入口
- `README.md`：补充三个新命令示例和路径说明

## 错误处理

- 不存在或不是目录的上传输入明确报告原始路径
- 多路径展开后出现重复 slug 时只执行一次
- 批量上传和批量更新都继续处理后续项，并在结尾集中报告失败
- 单 skill 调用保留原有抛错和交互行为，减少兼容性变化
- 批量（逐个）上传中，非交互且未提供 `--category` 时，首次发布的 skill 会按单 skill 规则逐个报错，由失败汇总兜住；交互下沿用覆盖确认
- Codex 入口创建失败时，该 skill 安装失败，不写入成功状态

## 测试与验证

采用测试驱动实现，至少覆盖：

- Commander 将多个 upload 路径和多个 update 参数解析为数组
- 直接 skill、一级容器目录和混合输入的展开、排序与去重（按 slug）
- 单路径容器目录仍走 package 导入 API（import-file），交互勾选默认全选
- 多路径展开出的 skill 分别调用单 skill API，而不是 package 导入 API
- 批量上传单项失败后继续，并设置失败退出状态
- update 的 slug 与路径参数解析为同一 slug（`aaa/bbb-skill` → `bbb-skill`），去重后只处理一次
- 批量更新只处理指定参数、共用一次 scope、保持其他项继续执行
- `--all` 与参数、`--version` 与多个参数的参数冲突
- Codex 全局入口解析为 `~/.codex/skills`，项目范围仍使用 `.agents/skills`
- 安装和卸载分别创建、清理 Codex 全局入口
- codex 判定修正后，其他同定义 agent（cursor 等）的全局 symlink 行为符合预期

最终运行 `dt-skill` 源码测试、TypeScript 类型检查、构建产物测试和 `git diff --check`。实现与本地验证完成后，启动独立 agent 只读审核需求覆盖、最终 diff 和验证证据；确认审核问题已处理后再交付。
