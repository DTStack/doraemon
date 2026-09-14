#!/usr/bin/env bash
set -euo pipefail

# 安装/更新 agent-market plugin marketplace（本地路径模式）。
#
# 背景：plugin marketplace 的 source 需是 git 仓库或本地路径；agent-market 走
# 172.16.100.225 HTTP 静态分发（目录索引关闭），因此先下载源码归档到本地
# ~/.agents/agent-market/，再用本地路径作为 marketplace source。
#
# 用法:
#   curl .../install.sh | bash                 # 下载源码 + 打印安装命令
#   curl .../install.sh | bash -s -- <agent>   # 下载源码 + 自动注册并安装指定 plugin
#
# 环境变量覆盖:
#   AGENT_MARKET_BASE_URL    Agent Market HTTP 服务地址
#   AGENT_MARKET_LOCAL_DIR   本地 marketplace 目录，默认: ~/.agents/agent-market
#   AGENT_MARKET_NAME        marketplace 名，默认: agent-market

AGENT_NAME="${1:-}"
CUSTOM_BASE_URL="${2:-}"
DEFAULT_MARKET_URL="__AGENT_MARKET_BASE_URL__"
if [[ "$DEFAULT_MARKET_URL" == *"__"* ]]; then
  DEFAULT_MARKET_URL="http://172.16.100.225:7001/agent-market"
fi
AGENT_MARKET_BASE_URL="${CUSTOM_BASE_URL:-${AGENT_MARKET_BASE_URL:-$DEFAULT_MARKET_URL}}"
AGENT_MARKET_BASE_URL="${AGENT_MARKET_BASE_URL%/}"
AGENT_MARKET_LOCAL_DIR="${AGENT_MARKET_LOCAL_DIR:-$HOME/.agents/agent-market}"
AGENT_MARKET_NAME="${AGENT_MARKET_NAME:-agent-market}"
DORAEMON_URL="${AGENT_MARKET_BASE_URL%/agent-market}"
SRC_URL="$DORAEMON_URL/api/agents/download?name=$AGENT_NAME"
PREFLIGHT_MISSING=0

log() { printf '%s\n' "$*"; }
ok() { printf '  ✓ %s\n' "$*"; }
warn() { printf '⚠️ %s\n' "$*" >&2; }
die() { printf '✗ %s\n' "$*" >&2; exit 1; }

# 解析宿主 CLI：优先 PATH 里的独立 CLI，否则用桌面 App 内置 CLI。实测 Codex App
#（ChatGPT.app）内置 /Applications/ChatGPT.app/Contents/Resources/codex，与独立 CLI
# 共享 ~/.codex/config.toml，可正常执行 plugin 子命令。
resolve_codex() {
  if command -v codex >/dev/null 2>&1; then
    printf '%s\n' "codex"
  elif [[ -x "/Applications/ChatGPT.app/Contents/Resources/codex" ]]; then
    printf '%s\n' "/Applications/ChatGPT.app/Contents/Resources/codex"
  else
    return 1
  fi
}
resolve_claude() {
  command -v claude >/dev/null 2>&1 && { printf '%s\n' "claude"; return 0; }
  return 1
}

command -v curl >/dev/null 2>&1 || die "需要安装 curl"
command -v unzip >/dev/null 2>&1 || die "需要安装 unzip"
command -v python3 >/dev/null 2>&1 || die "需要安装 python3"

if [[ -z "$AGENT_NAME" ]]; then
  die "GitOps 模式下必须指定 Agent 名称，例如: curl .../install.sh | bash -s -- bugfix-agent"
fi

if [[ ! "$AGENT_NAME" =~ ^[A-Za-z0-9._-]+$ ]]; then
  die "无效的 Agent 名称: $AGENT_NAME"
fi

case "$AGENT_MARKET_LOCAL_DIR" in
  ""|"/"|"$HOME") die "不安全的 AGENT_MARKET_LOCAL_DIR: $AGENT_MARKET_LOCAL_DIR" ;;
esac

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

log ""
log "下载 Agent源码归档: $SRC_URL"
curl -fsSL "$SRC_URL" -o "$TMP_DIR/agent.zip" \
  || die "下载失败: $SRC_URL"

mkdir -p "$TMP_DIR/extracted"
unzip -q "$TMP_DIR/agent.zip" -d "$TMP_DIR/extracted" \
  || die "归档解压失败"

SOURCE_DIR="$TMP_DIR/extracted/$AGENT_NAME"
[[ -d "$SOURCE_DIR" ]] || die "解压后未找到预期目录: $SOURCE_DIR"

# Move the single agent to the centralized agent-market folder
AGENT_TARGET_DIR="$AGENT_MARKET_LOCAL_DIR/agents/$AGENT_NAME"
mkdir -p "$(dirname "$AGENT_TARGET_DIR")"
rm -rf "$AGENT_TARGET_DIR"
mv "$SOURCE_DIR" "$AGENT_TARGET_DIR"

# Auto-generate or update the central marketplace.json
mkdir -p "$AGENT_MARKET_LOCAL_DIR/.claude-plugin"
mkdir -p "$AGENT_MARKET_LOCAL_DIR/.codex-plugin"

python3 - <<PY
import json
import os

market_dir = "$AGENT_MARKET_LOCAL_DIR"
agent_name = "$AGENT_NAME"
plugin_desc = "Dynamically installed via Doraemon"

# Try to read actual description from agent manifest
try:
    with open(f"{market_dir}/agents/{agent_name}/.codex-plugin/plugin.json", "r") as f:
        manifest = json.load(f)
        plugin_desc = manifest.get("description", plugin_desc)
except:
    pass

for folder in [".claude-plugin", ".codex-plugin"]:
    mf_path = f"{market_dir}/{folder}/marketplace.json"
    market = {"name": "agent-market", "owner": {"name": "Doraemon"}, "plugins": []}
    if os.path.exists(mf_path):
        try:
            with open(mf_path, "r") as f:
                market = json.load(f)
        except:
            pass
            
    if "owner" not in market:
        market["owner"] = {"name": "Doraemon"}
            
    # Remove existing entry if any
    market["plugins"] = [p for p in market.get("plugins", []) if p.get("name") != agent_name]
    
    # Add the new agent
    market["plugins"].append({
        "name": agent_name,
        "source": f"./agents/{agent_name}",
        "description": plugin_desc
    })
    
    with open(mf_path, "w") as f:
        json.dump(market, f, indent=2)
PY

ok "Agent 已就绪: $AGENT_TARGET_DIR"

[[ "$AGENT_NAME" =~ ^[A-Za-z0-9._-]+$ ]] || die "无效的 Agent 名称: $AGENT_NAME"

# 校验 AGENT_NAME 是 marketplace 里的 plugin 化 Agent（下载解压后按目录判断）。
[[ -f "$AGENT_MARKET_LOCAL_DIR/agents/$AGENT_NAME/.codex-plugin/plugin.json" ]] \
  || die "$AGENT_NAME 不是 plugin 化 Agent（缺 agents/$AGENT_NAME/.codex-plugin/plugin.json）"

# 从 .codex-plugin/plugin.json 的 interface.defaultPrompt 提取入口 skill 名（$xxx 形式），用于打印调用方式。
read_entrypoint() {
  python3 - "$AGENT_MARKET_LOCAL_DIR/agents/$AGENT_NAME/.codex-plugin/plugin.json" <<'PY'
import json, re, sys
try:
    data = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    sys.exit(0)

prompts = data.get("interface", {}).get("defaultPrompt", [])
if isinstance(prompts, list):
    for p in prompts:
        m = re.search(r'\$([A-Za-z0-9_-]+)', p)
        if m:
            print(m.group(1))
            sys.exit(0)
PY
}

CODEX="$(resolve_codex || true)"
CLAUDE="$(resolve_claude || true)"

# 注册 marketplace + 安装 plugin（读命令输出判断是否已注册/已安装，幂等可重复执行）。
install_codex() {
  local cli="$1"
  log ""
  log "Codex 安装 $AGENT_NAME@$AGENT_MARKET_NAME ..."

  # 注册 local marketplace（只在未注册时 add，避免重复报错）
  if "$cli" plugin marketplace list 2>/dev/null | grep -Fq "$AGENT_MARKET_NAME"; then
    ok "marketplace $AGENT_MARKET_NAME 已注册，跳过"
  else
    "$cli" plugin marketplace add "$AGENT_MARKET_LOCAL_DIR" \
      || die "codex plugin marketplace add 失败"
    ok "marketplace $AGENT_MARKET_NAME 已注册"
  fi

  local installed="$HOME/.codex/plugins/cache/$AGENT_MARKET_NAME/$AGENT_NAME"
  if [[ -d "$installed" ]]; then
    ok "plugin $AGENT_NAME 已安装，跳过"
  else
    "$cli" plugin add "$AGENT_NAME@$AGENT_MARKET_NAME" \
      || die "codex plugin add 失败"
    ok "plugin $AGENT_NAME 已安装"
  fi
}

install_claude() {
  local cli="$1"
  log ""
  log "Claude Code 安装 $AGENT_NAME@$AGENT_MARKET_NAME ..."

  local installed="$HOME/.claude/plugins/installed_plugins.json"
  if "$cli" plugin marketplace list 2>/dev/null | grep -Fq "$AGENT_MARKET_NAME"; then
    ok "marketplace $AGENT_MARKET_NAME 已注册，更新索引"
    "$cli" plugin marketplace update "$AGENT_MARKET_NAME" >/dev/null 2>&1 || true
  else
    "$cli" plugin marketplace add "$AGENT_MARKET_LOCAL_DIR" \
      || die "claude plugin marketplace add 失败"
    ok "marketplace $AGENT_MARKET_NAME 已注册"
  fi
  if [[ -f "$installed" ]] && grep -Fq "\"$AGENT_NAME\"" "$installed"; then
    ok "plugin $AGENT_NAME 已安装，跳过"
  else
    # `--yes` 用于跳过 declare-command 插件安装的确认（非 TTY 下必需），但仅较新 CLI 支持；
    # 旧版本（如 v2.1.119）不认该选项会直接报错。先捕获 `plugin install --help` 输出再 grep
    # （含 stderr，兼容 help 打到 stderr 的 CLI）——管道 + grep -q 在输出超管道缓冲时会被
    # SIGPIPE 误判为未匹配，捕获方式无此问题。追加与探测同一字符串 --yes，避免仅支持长选项
    # 的 CLI 拒绝 -y 别名。
    local yes_flag="" help_out
    help_out="$("$cli" plugin install --help 2>&1 || true)"
    if grep -q -- '--yes' <<<"$help_out"; then
      yes_flag="--yes"
    fi
    "$cli" plugin install "$AGENT_NAME@$AGENT_MARKET_NAME" ${yes_flag:+"--yes"} \
      || die "claude plugin install 失败"
    ok "plugin $AGENT_NAME 已安装"
  fi
}

# plugin 机制不自动装依赖；所有依赖 Skill 已随插件 skills/ 快照分发，无需全局安装。
# 安装前预检：Agent 目录自带 setup.sh 时运行，探测运行时依赖的环境变量/工具，
# 产出 setup-report（行格式: <kind> <state> <args>），最终由 render_preflight_report 渲染。
run_preflight() {
  local setup="$AGENT_MARKET_LOCAL_DIR/agents/$AGENT_NAME/setup.sh"
  [[ -f "$setup" ]] || return 0
  log ""
  log "运行 Agent 安装前检查（setup）..."
  (
    cd "$(dirname "$setup")"
    AGENT_DIR="$(dirname "$setup")" \
    AGENT_NAME="$AGENT_NAME" \
    SETUP_REPORT="$TMP_DIR/setup-report" \
      bash ./setup.sh
  ) || warn "Agent 环境检查未通过，继续安装"
}

render_preflight_report() {
  local report="$TMP_DIR/setup-report"
  [[ -f "$report" ]] || return 0

  local kind state args name reason
  local tools_shown=0 env_shown=0

  log ""
  log "【环境检查结论】"
  while read -r kind state args; do
    [[ -n "$kind" ]] || continue
    if [[ "$state" == "MISSING" ]]; then
      PREFLIGHT_MISSING=1
    fi
    if [[ "$kind" == "TOOL" && "$tools_shown" -eq 0 ]]; then
      log ""
      log "运行环境:"
      tools_shown=1
    fi
    if [[ "$kind" == "ENV" && "$env_shown" -eq 0 ]]; then
      log ""
      log "环境变量配置情况:"
      env_shown=1
    fi
    if [[ "$state" == "CONFIGURED" ]]; then
      ok "${args// /、}"
    elif [[ "$kind" == "TOOL" ]]; then
      printf '  ❌ %s（未安装）\n' "${args// /、}"
    else
      name="${args%% *}"
      reason="${args#* }"
      if [[ -n "$reason" && "$reason" != "$name" ]]; then
        printf '  ❌ %s（未配置，%s）\n' "$name" "$reason"
      else
        printf '  ❌ %s（未配置）\n' "$name"
      fi
    fi
  done < "$report"
}

run_preflight

if [[ -n "$CODEX" ]]; then
  install_codex "$CODEX"
fi
if [[ -n "$CLAUDE" ]]; then
  install_claude "$CLAUDE"
fi

render_preflight_report

log ""
if [[ "$PREFLIGHT_MISSING" -eq 1 ]]; then
  log "【⚠️ 安装结束】存在未就绪项（缺失工具 / 未配置环境变量），请按上方提示处理后使用"
else
  log "【✅ 安装完成】$AGENT_NAME"
fi
ENTRYPOINT="$(read_entrypoint)"
if [[ -n "$ENTRYPOINT" ]]; then
  [[ -n "$CODEX" ]]  && log "Codex 调用:      \$$ENTRYPOINT"
  [[ -n "$CLAUDE" ]] && log "Claude Code 调用: /$AGENT_NAME:$ENTRYPOINT"
fi
log ""
