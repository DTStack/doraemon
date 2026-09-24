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

AGENT_NAME=""
CUSTOM_BASE_URL=""
FORCE=0
IS_UPDATE=0
HAS_DIFF=0

# 解析命令行参数，支持 --force 强制重装和 -h 帮助
for arg in "$@"; do
  case "$arg" in
    --force|-f)
      FORCE=1
      ;;
    -h|--help)
      cat <<EOF
用法:
  curl .../install.sh | bash -s -- <agent> [base_url] [--force]

选项:
  --force, -f    强制重新安装，清除本地插件缓存
  -h, --help     显示帮助信息
EOF
      exit 0
      ;;
    *)
      if [[ -z "$AGENT_NAME" ]]; then
        AGENT_NAME="$arg"
      elif [[ -z "$CUSTOM_BASE_URL" ]]; then
        CUSTOM_BASE_URL="$arg"
      fi
      ;;
  esac
done

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
if [[ -d "$AGENT_TARGET_DIR" ]]; then
  IS_UPDATE=1
  # 对比新下载解压内容与本地目录是否存在文件差异（忽略 macOS .DS_Store 及 Python 缓存）
  if ! diff -rq -x '.DS_Store' -x '__pycache__' -x '*.pyc' "$SOURCE_DIR" "$AGENT_TARGET_DIR" >/dev/null 2>&1; then
    HAS_DIFF=1
  fi
else
  HAS_DIFF=1
fi

if [[ "$HAS_DIFF" -eq 1 || "$FORCE" -eq 1 ]]; then
  mkdir -p "$(dirname "$AGENT_TARGET_DIR")"
  rm -rf "$AGENT_TARGET_DIR"
  mv "$SOURCE_DIR" "$AGENT_TARGET_DIR"
fi

# Auto-generate or update the central marketplace.json
mkdir -p "$AGENT_MARKET_LOCAL_DIR/.claude-plugin"
mkdir -p "$AGENT_MARKET_LOCAL_DIR/.codex-plugin"

# 校验 AGENT_NAME 是 marketplace 里的 plugin 化 Agent（下载解压后按目录判断）
[[ -f "$AGENT_MARKET_LOCAL_DIR/agents/$AGENT_NAME/.codex-plugin/plugin.json" ]] \
  || die "$AGENT_NAME 不是 plugin 化 Agent（缺 agents/$AGENT_NAME/.codex-plugin/plugin.json）"

# 统一执行单个 Python 进程提取元数据并更新 marketplace
python3 - "$AGENT_MARKET_LOCAL_DIR" "$AGENT_NAME" "$TMP_DIR/meta.sh" <<'PY'
import json, os, re, shlex, sys

market_dir = sys.argv[1]
agent_name = sys.argv[2]
meta_file = sys.argv[3]

agent_dir = os.path.join(market_dir, "agents", agent_name)
plugin_desc = "Dynamically installed via Doraemon"
plugin_version = ""
entrypoint = ""

# 读取 manifest 解析元数据（优先 codex-plugin，备选 claude-plugin）
for manifest_rel in [".codex-plugin/plugin.json", ".claude-plugin/plugin.json"]:
    manifest_path = os.path.join(agent_dir, manifest_rel)
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not plugin_desc or plugin_desc == "Dynamically installed via Doraemon":
                plugin_desc = data.get("description", plugin_desc)
            if not plugin_version:
                plugin_version = str(data.get("version", "")).strip()
            if not entrypoint:
                prompts = data.get("interface", {}).get("defaultPrompt", [])
                if isinstance(prompts, list):
                    for p in prompts:
                        m = re.search(r'\$([A-Za-z0-9_-]+)', p)
                        if m:
                            entrypoint = m.group(1)
                            break
        except Exception:
            pass

# 更新双端 marketplace.json
for folder in [".claude-plugin", ".codex-plugin"]:
    mf_path = os.path.join(market_dir, folder, "marketplace.json")
    market = {"name": "agent-market", "owner": {"name": "Doraemon"}, "plugins": []}
    if os.path.exists(mf_path):
        try:
            with open(mf_path, "r", encoding="utf-8") as f:
                market = json.load(f)
        except Exception:
            pass

    if "owner" not in market:
        market["owner"] = {"name": "Doraemon"}

    # 过滤旧条目并追加新条目
    market["plugins"] = [p for p in market.get("plugins", []) if p.get("name") != agent_name]
    plugin_entry = {
        "name": agent_name,
        "source": f"./agents/{agent_name}",
        "description": plugin_desc
    }
    if plugin_version:
        plugin_entry["version"] = plugin_version
    market["plugins"].append(plugin_entry)

    with open(mf_path, "w", encoding="utf-8") as f:
        json.dump(market, f, indent=2, ensure_ascii=False)

# 写出环境变量供当前 Shell 直接 source
with open(meta_file, "w", encoding="utf-8") as f:
    f.write(f"VERSION={shlex.quote(plugin_version)}\n")
    f.write(f"ENTRYPOINT={shlex.quote(entrypoint)}\n")
PY

source "$TMP_DIR/meta.sh"
if [[ "$IS_UPDATE" -eq 1 && "$HAS_DIFF" -eq 0 && "$FORCE" -eq 0 ]]; then
  ok "Agent 源码无变动（已是最新）: $AGENT_TARGET_DIR${VERSION:+ (v$VERSION)}"
elif [[ "$IS_UPDATE" -eq 1 ]]; then
  ok "Agent 源码已更新: $AGENT_TARGET_DIR${VERSION:+ (v$VERSION)}"
else
  ok "Agent 已就绪: $AGENT_TARGET_DIR${VERSION:+ (v$VERSION)}"
fi

CODEX="$(resolve_codex || true)"
CLAUDE="$(resolve_claude || true)"

# 注册 marketplace + 安装/更新 plugin（自动探测已安装状态，支持重复执行时覆盖更新）
install_codex() {
  local cli="$1"
  local installed="$HOME/.codex/plugins/cache/$AGENT_MARKET_NAME/$AGENT_NAME"
  local is_installed=0
  if [[ -d "$installed" ]]; then
    is_installed=1
  fi

  log ""
  if [[ "$is_installed" -eq 1 && "$HAS_DIFF" -eq 0 && "$FORCE" -eq 0 ]]; then
    log "Codex 检查 $AGENT_NAME@$AGENT_MARKET_NAME ..."
  elif [[ "$is_installed" -eq 1 ]]; then
    log "Codex 更新 $AGENT_NAME@$AGENT_MARKET_NAME ..."
  else
    log "Codex 安装 $AGENT_NAME@$AGENT_MARKET_NAME ..."
  fi

  # 注册 local marketplace（只在未注册时 add，避免重复报错）
  if "$cli" plugin marketplace list 2>/dev/null | grep -Fq "$AGENT_MARKET_NAME"; then
    ok "marketplace $AGENT_MARKET_NAME 已注册，跳过"
  else
    "$cli" plugin marketplace add "$AGENT_MARKET_LOCAL_DIR" \
      || die "codex plugin marketplace add 失败"
    ok "marketplace $AGENT_MARKET_NAME 已注册"
  fi

  # 若无变动且已安装缓存存在，跳过重新安装
  if [[ "$is_installed" -eq 1 && "$HAS_DIFF" -eq 0 && "$FORCE" -eq 0 ]]; then
    ok "plugin $AGENT_NAME 已是最新"
  elif [[ "$is_installed" -eq 1 || "$FORCE" -eq 1 ]]; then
    rm -rf "$installed"
    "$cli" plugin add "$AGENT_NAME@$AGENT_MARKET_NAME" \
      || die "codex plugin add 失败"
    ok "plugin $AGENT_NAME 已更新"
  else
    "$cli" plugin add "$AGENT_NAME@$AGENT_MARKET_NAME" \
      || die "codex plugin add 失败"
    ok "plugin $AGENT_NAME 已安装"
  fi
}

install_claude() {
  local cli="$1"
  local installed="$HOME/.claude/plugins/installed_plugins.json"
  local is_installed=0
  if [[ -f "$installed" ]] && grep -Fq "\"$AGENT_NAME@$AGENT_MARKET_NAME\"" "$installed"; then
    is_installed=1
  fi

  log ""
  if [[ "$is_installed" -eq 1 && "$HAS_DIFF" -eq 0 && "$FORCE" -eq 0 ]]; then
    log "Claude Code 检查 $AGENT_NAME@$AGENT_MARKET_NAME ..."
  elif [[ "$is_installed" -eq 1 ]]; then
    log "Claude Code 更新 $AGENT_NAME@$AGENT_MARKET_NAME ..."
  else
    log "Claude Code 安装 $AGENT_NAME@$AGENT_MARKET_NAME ..."
  fi

  if "$cli" plugin marketplace list 2>/dev/null | grep -Fq "$AGENT_MARKET_NAME"; then
    ok "marketplace $AGENT_MARKET_NAME 已注册，更新索引"
    "$cli" plugin marketplace update "$AGENT_MARKET_NAME" >/dev/null 2>&1 || true
  else
    "$cli" plugin marketplace add "$AGENT_MARKET_LOCAL_DIR" \
      || die "claude plugin marketplace add 失败"
    ok "marketplace $AGENT_MARKET_NAME 已注册"
  fi

  # `--yes` 用于跳过 declare-command 插件安装的确认（非 TTY 下必需），但仅较新 CLI 支持
  local yes_flag="" help_out
  help_out="$("$cli" plugin install --help 2>&1 || true)"
  if grep -q -- '--yes' <<<"$help_out"; then
    yes_flag="--yes"
  fi

  # 若无变动且已安装，无需重新安装
  if [[ "$is_installed" -eq 1 && "$HAS_DIFF" -eq 0 && "$FORCE" -eq 0 ]]; then
    ok "plugin $AGENT_NAME 已是最新"
  elif [[ "$is_installed" -eq 1 || "$FORCE" -eq 1 ]]; then
    "$cli" plugin uninstall "$AGENT_NAME@$AGENT_MARKET_NAME" >/dev/null 2>&1 || true
    "$cli" plugin install "$AGENT_NAME@$AGENT_MARKET_NAME" ${yes_flag:+"--yes"} \
      || die "claude plugin install 失败"
    ok "plugin $AGENT_NAME 已更新"
  else
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

if [[ -z "$CODEX" && -z "$CLAUDE" ]]; then
  log ""
  warn "未检测到 Codex 或 Claude Code CLI，仅下载解压 Agent 源码至本地，未注册插件到宿主"
else
  if [[ -n "$CODEX" ]]; then
    install_codex "$CODEX"
  fi
  if [[ -n "$CLAUDE" ]]; then
    install_claude "$CLAUDE"
  fi
fi

render_preflight_report

log ""
action_text="安装"
if [[ "$IS_UPDATE" -eq 1 ]]; then
  action_text="更新"
fi
if [[ "$PREFLIGHT_MISSING" -eq 1 ]]; then
  log "【⚠️ ${action_text}结束】${AGENT_NAME}${VERSION:+ (v$VERSION)} 存在未就绪项（缺失工具 / 未配置环境变量），请按上方提示处理后使用"
elif [[ "$IS_UPDATE" -eq 1 && "$HAS_DIFF" -eq 0 && "$FORCE" -eq 0 ]]; then
  log "【✅ 已是最新】${AGENT_NAME}${VERSION:+ (v$VERSION)}"
elif [[ "$IS_UPDATE" -eq 1 ]]; then
  log "【✅ 更新完成】${AGENT_NAME}${VERSION:+ (v$VERSION)}"
else
  log "【✅ 安装完成】${AGENT_NAME}${VERSION:+ (v$VERSION)}"
fi
if [[ -n "$ENTRYPOINT" ]]; then
  [[ -n "$CODEX" ]]  && log "Codex 调用:      \$$ENTRYPOINT"
  [[ -n "$CLAUDE" ]] && log "Claude Code 调用: /$AGENT_NAME:$ENTRYPOINT"
fi
if [[ -z "$CODEX" && -z "$CLAUDE" ]]; then
  log "提示: 可在安装 Codex 或 Claude Code 后重新执行本脚本注册插件"
fi
log ""
