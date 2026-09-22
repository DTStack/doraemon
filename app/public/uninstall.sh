#!/usr/bin/env bash
set -euo pipefail

# 卸载 agent-market 中的指定 plugin。
#
# 用法:
#   curl .../uninstall.sh | bash -s -- <agent>
#
# 环境变量覆盖:
#   AGENT_MARKET_LOCAL_DIR   本地 marketplace 目录，默认: ~/.agents/agent-market
#   AGENT_MARKET_NAME        marketplace 名，默认: agent-market

AGENT_NAME=""

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      cat <<EOF
用法:
  curl .../uninstall.sh | bash -s -- <agent>

选项:
  -h, --help     显示帮助信息
EOF
      exit 0
      ;;
    *)
      if [[ -z "$AGENT_NAME" ]]; then
        AGENT_NAME="$arg"
      fi
      ;;
  esac
done

AGENT_MARKET_LOCAL_DIR="${AGENT_MARKET_LOCAL_DIR:-$HOME/.agents/agent-market}"
AGENT_MARKET_NAME="${AGENT_MARKET_NAME:-agent-market}"

log() { printf '%s\n' "$*"; }
ok() { printf '  ✓ %s\n' "$*"; }
warn() { printf '⚠️ %s\n' "$*" >&2; }
die() { printf '✗ %s\n' "$*" >&2; exit 1; }

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

command -v python3 >/dev/null 2>&1 || die "需要安装 python3"

if [[ -z "$AGENT_NAME" ]]; then
  die "必须指定要卸载的 Agent 名称，例如: curl .../uninstall.sh | bash -s -- bugfix-agent"
fi

if [[ ! "$AGENT_NAME" =~ ^[A-Za-z0-9._-]+$ ]]; then
  die "无效的 Agent 名称: $AGENT_NAME"
fi

case "$AGENT_MARKET_LOCAL_DIR" in
  ""|"/"|"$HOME") die "不安全的 AGENT_MARKET_LOCAL_DIR: $AGENT_MARKET_LOCAL_DIR" ;;
esac

log ""
log "开始卸载 Agent 插件: $AGENT_NAME (来源 marketplace: $AGENT_MARKET_NAME) ..."

CODEX="$(resolve_codex || true)"
CLAUDE="$(resolve_claude || true)"

# 1. Codex 端卸载
if [[ -n "$CODEX" ]]; then
  log ""
  log "Codex 卸载 $AGENT_NAME@$AGENT_MARKET_NAME ..."
  if "$CODEX" plugin remove "$AGENT_NAME@$AGENT_MARKET_NAME" >/dev/null 2>&1; then
    ok "Codex 插件已移除"
  else
    if "$CODEX" plugin remove "$AGENT_NAME" >/dev/null 2>&1; then
      ok "Codex 插件已移除"
    else
      ok "Codex 未发现活跃插件或已移除，跳过"
    fi
  fi
  rm -rf "$HOME/.codex/plugins/cache/$AGENT_MARKET_NAME/$AGENT_NAME"
fi

# 2. Claude Code 端卸载
if [[ -n "$CLAUDE" ]]; then
  log ""
  log "Claude Code 卸载 $AGENT_NAME@$AGENT_MARKET_NAME ..."
  if "$CLAUDE" plugin uninstall "$AGENT_NAME@$AGENT_MARKET_NAME" >/dev/null 2>&1; then
    ok "Claude Code 插件已移除"
  else
    if "$CLAUDE" plugin uninstall "$AGENT_NAME" >/dev/null 2>&1; then
      ok "Claude Code 插件已移除"
    else
      ok "Claude Code 未发现活跃插件或已移除，跳过"
    fi
  fi
  rm -rf "$HOME/.claude/plugins/cache/$AGENT_MARKET_NAME/$AGENT_NAME"
fi

# 3. 本地 marketplace.json 清理
python3 - "$AGENT_MARKET_LOCAL_DIR" "$AGENT_NAME" <<'PY'
import json, os, sys

market_dir = sys.argv[1]
agent_name = sys.argv[2]

for folder in [".claude-plugin", ".codex-plugin"]:
    mf_path = os.path.join(market_dir, folder, "marketplace.json")
    if os.path.exists(mf_path):
        try:
            with open(mf_path, "r", encoding="utf-8") as f:
                market = json.load(f)
            plugins = market.get("plugins", [])
            initial_len = len(plugins)
            market["plugins"] = [p for p in plugins if p.get("name") != agent_name]
            if len(market["plugins"]) != initial_len:
                with open(mf_path, "w", encoding="utf-8") as f:
                    json.dump(market, f, indent=2, ensure_ascii=False)
        except Exception:
            pass
PY

# 4. 删除本地集中目录
AGENT_TARGET_DIR="$AGENT_MARKET_LOCAL_DIR/agents/$AGENT_NAME"
if [[ -d "$AGENT_TARGET_DIR" ]]; then
  rm -rf "$AGENT_TARGET_DIR"
  ok "本地插件目录已清理: $AGENT_TARGET_DIR"
fi

# 5. 更新本地 marketplace 索引
if [[ -n "$CLAUDE" ]]; then
  "$CLAUDE" plugin marketplace update "$AGENT_MARKET_NAME" >/dev/null 2>&1 || true
fi

log ""
ok "Agent 插件 $AGENT_NAME 卸载完成！"
