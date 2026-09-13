#!/usr/bin/env bash
#
# create-plugin.sh — 快速创建同时面向 Claude Code 与 Codex 的跨端 plugin 骨架。
#
# 用法:
#   ./create-plugin.sh <plugin-name> [目标路径]
#
# 示例:
#   ./create-plugin.sh my-plugin                 # 在 ./  下建 my-plugin/
#   ./create-plugin.sh my-plugin ./output        # 在 ./output/ 下建 my-plugin/
#
# 说明:
#   - 自动生成双端 manifest(.claude-plugin/plugin.json 与 .codex-plugin/plugin.json),
#     字段末尾已预留占位注释,可直接照着文档填。
#   - 其余目录(agents/ skills/ hooks/ scripts/ ...)为示例骨架,按需增删。
#   - 生成的两个 plugin.json 目前是 JSONC(含 // 注释)模板;正式发布前请将其转为
#     标准 JSON(可用 claude plugin validate 校验 / Codex 侧用官方校验器)。
#
set -euo pipefail

# ---------- 参数解析 ----------
PLUGIN_NAME="${1:-}"
TARGET="${2:-.}"

if [[ -z "$PLUGIN_NAME" ]]; then
  echo "用法: $0 <plugin-name> [目标路径]" >&2
  echo "  例: $0 my-plugin" >&2
  exit 1
fi

# 规格化为 kebab-case(全小写、下划线/空格转连字符),兼容 bash 3.2(不带 ${K,,})
K="$(printf '%s' "$PLUGIN_NAME" | tr '[:upper:]' '[:lower:]' | tr '_' ' ' | tr -s ' ' | tr ' ' '-')"
K="${K#.}"
K="${K%%/}"
K="${K##/}"
if [[ -z "$K" || "$K" == *"../"* || "$K" == /* ]]; then
  echo "错误: plugin 名 \"$PLUGIN_NAME\" 无效,应为 kebab-case 名称(字母/数字/连字符)" >&2
  exit 1
fi

DIR="${TARGET}/${K}"
mkdir -p "$DIR"
cd "$DIR"

# 占位符;sed 替换(用临时文件以兼容 mac 的 sed)
PH="__PLUGIN_NAME__"
apply_ph_name() {
  local f="$1"
  sed "s/${PH}/${K}/g" "$f" > "$f.tmp" && mv "$f.tmp" "$f"
}

# ---------- 1. Claude Code manifest ----------
mkdir -p ".claude-plugin"
cat > ".claude-plugin/plugin.json" <<'EOF'
{
  // Claude Code Plugin 清单（完整参考：https://code.claude.com/docs/en/plugins-reference）
  "$schema": "https://json.schemastore.org/claude-plugin.json", // 可选：editor 补全用；加载时忽略（占位 URL）
  "name": "__PLUGIN_NAME__",            // 必填：kebab-case 唯一标识，组件命名空间前缀（如 __PLUGIN_NAME__:agent）
  "displayName": "",                    // 可选：UI 展示的可读名，可含空格/大小写
  "version": "1.0.0",                   // 可选：语义化版本；改动此字段才会触发升级
  "description": "",                    // 可选：插件一句话简介
  "author": {                           // 可选：作者归属
    "name": "",                         //   姓名
    "email": "",                        //   邮箱
    "url": ""                           //   主页
  },
  "homepage": "",                       // 可选：文档 URL
  "repository": "",                     // 可选：源码仓库 URL
  "license": "",                        // 可选：许可证标识，如 "MIT"
  "keywords": [],                       // 可选：发现用标签
  "metadata": {},                       // 可选：自由数据，Claude Code 完全忽略（可用于跨工具清单）
  "defaultEnabled": true,               // 可选：是否默认启用，默认 true
  // --- 下列字段指向自定义组件目录/文件，缺省时走默认目录 ---
  "skills": "",                         // 可选：自定义 skill 目录（追加到默认 skills/）
  "commands": "",                       // 可选：扁平 .md 文件（替换默认 commands/）
  "agents": "",                         // 可选：自定义 agent 文件（替换默认 agents/）
  "workflows": "",                      // 可选：自定义 workflow 脚本（替换默认 workflows/）
  "hooks": "",                          // 可选：hook 配置路径或内联配置
  "mcpServers": "",                     // 可选：MCP 配置路径或内联配置
  "outputStyles": "",                   // 可选：自定义输出样式（替换默认 output-styles/）
  "lspServers": "",                     // 可选：LSP server 配置
  "experimental": {                     // 可选：实验性组件
    "themes": "",                       //   主题文件/目录（替换默认 themes/）
    "monitors": ""                      //   后台 monitor 配置（替换默认 monitors/）
  },
  "userConfig": {},                     // 可选：启用时向用户询问的值，如 { "api_endpoint": { "type": "string", "title": "", "description": "" } }
  "channels": [],                       // 可选：消息通道声明，如 { "server": "telegram", "userConfig": {} }
  "dependencies": [                     // 可选：依赖的其他 plugin（字符串或 {name, version}）
    // "helper-lib",
    // { "name": "secrets-vault", "version": "~2.1.0" }
  ]
}
EOF
apply_ph_name ".claude-plugin/plugin.json"

# ---------- 2. Codex manifest ----------
mkdir -p ".codex-plugin"
cat > ".codex-plugin/plugin.json" <<'EOF'
{
  // Codex Plugin 清单（参考 OpenAI 模板：https://developers.openai.com/plugins/build/plugins）
  "name": "__PLUGIN_NAME__",              // 必填：kebab-case 插件唯一标识，也是组件命名空间
  "version": "0.1.0",                     // 可选：版本号；可加构建缀，如 0.1.0+codex.YYYYMMDD
  "description": "",                       // 可选：插件一句话简介
  "author": {                              // 可选：作者
    "name": ""                             //   姓名
  },
  "homepage": "",                          // 可选：文档 / 项目主页 URL
  "repository": "",                        // 可选：源码仓库 URL
  "license": "",                           // 可选：许可证标识，如 "MIT"
  "keywords": [],                          // 可选：发现用关键词
  "skills": "./skills/",                   // 可选：自定义 skill 目录（缺省即 ./skills/）
  "agents": "./agents/",                   // 可选：自定义 agent 目录（缺省即 ./agents/）
  "hooks": "./hooks/codex-hooks.json",     // 可选：hook 配置路径（对应 hooks/codex-hooks.json）
  "interface": {                           // 可选：安装面（store）展示配置
    "displayName": "",                     //   插件标题
    "shortDescription": "",                //   一句话简介
    "longDescription": "",                 //   详细描述
    "developerName": "",                   //   开发者名
    "category": "Coding",                  //   分类，如 "Coding" / "Productivity"
    "capabilities": [                      //   声明所需能力
      "Interactive",
      "Read",
      "Write",
      "Bash"
    ],
    "defaultPrompt": [],                   //   首次使用推荐提示词
    "brandColor": ""                       //   品牌色（hex），如 "#8B5CF6"
  }
}
EOF
apply_ph_name ".codex-plugin/plugin.json"

# ---------- 3. agents（Claude: .md；Codex: .toml）----------
mkdir -p "agents/claude"
cat > "agents/claude/${K}-assistant.md" <<'EOF'
---
description: 一句话说明该 agent 何时被调用（Claude Code 依据 description 决定是否使用）
name: __PLUGIN_NAME__-assistant
tools: Read, Write, Edit
model: sonnet
---

# __PLUGIN_NAME__ assistant

在这里编写该 agent 的系统提示词 / 职责说明。
EOF

cat > "agents/${K}-assistant.toml" <<'EOF'
# Codex 专属 Agent 定义（骨架占位，字段以 OpenAI Codex / Agent Plugins 规范为准）
name = "__PLUGIN_NAME__-assistant"
description = "一句话说明该 agent 何时被调用"
model = "gemini-2.5-pro" # 占位：按需替换供应商与型号

# 如需绑定 skill，可在此列出
# skills = ["<skill-name>"]
EOF
apply_ph_name "agents/claude/${K}-assistant.md"
apply_ph_name "agents/${K}-assistant.toml"

# ---------- 4. scripts（可选，存放自研脚本）----------
mkdir -p "scripts"

# ---------- 5. skills（示例骨架）----------
mkdir -p "skills/demo"
cat > "skills/demo/SKILL.md" <<'EOF'
---
description: 一句话说明该 skill 何时被调用（Claude Code 与 Codex 都依据它判断是否调用）
---

# demo

在这里编写该 skill 的具体指令内容。
EOF

# ---------- 6. hooks ----------
mkdir -p "hooks"
cat > "hooks/claude-hooks.json" <<'EOF'
{
  // Claude Code Hook 配置（参考：https://code.claude.com/docs/en/hooks）
  "hooks": {
    "PreToolUse": [],    // 工具调用前触发
    "PostToolUse": [     // 工具调用后触发
      {
        "matcher": "Write|Edit",
        "hooks": [                                  // 同一事件可挂多个命令
          { "type": "command", "command": "" }      // 退出码 0 表示通过；输入从 stdin 传入 JSON
        ]
      }
    ]
  }
}
EOF

cat > "hooks/codex-hooks.json" <<'EOF'
{
  // Codex Hook 配置（骨架占位，字段以 OpenAI Codex 插件 hooks 规范为准）
  "hooks": []
}
EOF

# ---------- 7. MCP 配置（可选）----------
cat > ".mcp.json" <<'EOF'
{
  // 项目级 MCP server 配置（Claude Code / Codex 通用）
  "mcpServers": {} // 例：{ "my-server": { "type": "stdio", "command": "npx", "args": ["-y", "mcp-server"] } }
}
EOF

# ---------- 8. assets（Codex interface 图标等）----------
mkdir -p "assets"

# ---------- 9. README ----------
cat > "README.md" <<'EOF'
# __PLUGIN_NAME__

一个同时支持 **Claude Code** 与 **Codex** 的跨端 plugin 骨架。

## 目录结构

```
./
├── .claude-plugin/            # Claude Code 配置
│   └── plugin.json            #   Claude Plugin Manifest
├── .codex-plugin/             # Codex 配置
│   └── plugin.json            #   Codex Plugin Manifest
├── agents/                    # Agent 定义（按需）
│   ├── claude/__PLUGIN_NAME__-assistant.md    #  Claude Code 专属 Agent
│   └── __PLUGIN_NAME__-assistant.toml         #  Codex 专属 Agent
├── scripts/                   # 自研脚本（按需）
├── skills/                    # Skill
│   └── demo/SKILL.md
├── hooks/                     # Hook（按需）
│   ├── claude-hooks.json      #   Claude Code Hook
│   └── codex-hooks.json       #   Codex Hook
├── .mcp.json                  # MCP 配置（按需）
├── assets/                    # Codex interface 图标 / logo / 截图
└── README.md
```

## 相关文档

- Claude Code Plugins：https://code.claude.com/docs/en/plugins
- Codex Plugins（Agent Plugins）：https://developers.openai.com/plugins/build/plugins

## 兼容性说明

两个 `plugin.json` 目前是 **JSONC（含 `//` 注释）模板**，便于对照文档填写。
正式发布 / 交给对应 CLI 加载前，请移除注释转成标准 JSON：

- Claude Code：运行 `claude plugin validate .` 校验
- Codex：按官方校验器 / CLI 校验
EOF
apply_ph_name "README.md"

# ---------- 完成 ----------
echo "✔ 已生成 plugin: $K"
echo "  位置：$(pwd)"
echo
echo "目录结构:"
find . -type f | sort | sed 's/^\.\//  └── /'