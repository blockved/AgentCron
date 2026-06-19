#!/usr/bin/env bash
# spec-sync-check.sh — spec / 代码 / 验证证据一致性提醒
#
# 触发：PostToolUse hook（Write|Edit|MultiEdit）后自动运行
# 默认 warning-only，永不阻断
# 目的：当 docs/specs/active/{feature}/ 与代码改动不同步时提示对账
#
# 退出码：恒为 0

set -u

ACTIVE_DIR="docs/specs/active"

if [ ! -d "$ACTIVE_DIR" ]; then
  exit 0
fi

active_count=$(find "$ACTIVE_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
if [ "$active_count" -eq 0 ]; then
  exit 0
fi

echo "[spec-sync] 检测到 $active_count 个 active feature，请确认本次代码改动是否需要同步更新："
echo "[spec-sync]   - tasks.md 的 checkpoint"
echo "[spec-sync]   - verification.md 的证据"
echo "[spec-sync]   - 已有 finding 的状态"

exit 0
