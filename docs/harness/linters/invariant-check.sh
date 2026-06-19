#!/usr/bin/env bash
# invariant-check.sh — Open Harness V2 不变量检查（greenfield 占位）
#
# 触发：PostToolUse hook（Write|Edit|MultiEdit）后自动运行
# 当前状态：仓库为 greenfield，业务规则尚未沉淀，此脚本仅做非阻断提醒
# 后续填充：业务域确认后，按 docs/harness/invariants/*.md 中的规则补充实际检查
#
# 退出码约定：
#   0  通过 / warning-only
#   非 0  仅在严重违规时使用（greenfield 阶段不启用）

set -u

echo "[invariant-check] greenfield 模式：跳过严格检查，仅提示。"
echo "[invariant-check] 规则参见 docs/harness/invariants/ 与 docs/harness/infrastructure/"

# TODO: 业务域确认后补充以下检查
#   - 金额字段是否使用 BigDecimal
#   - 是否存在 SELECT *
#   - 是否在事务内发送 MQ
#   - 是否硬编码密码/密钥
#   - 是否打印未脱敏的 PII

exit 0
