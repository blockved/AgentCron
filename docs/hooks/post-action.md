# Post-Action 自动检查

> 本文件描述 PostToolUse hook 的预期行为与扩展方式。实际脚本位于 `docs/harness/linters/`。

## 检查项

每次 `Write` / `Edit` / `MultiEdit` 写文件后，按顺序执行：

1. **invariant-check.sh** — 不变量自动检查
   - greenfield 阶段：仅提示，不阻断
   - 业务域确认后扩展：金额类型、SQL 安全、PII 脱敏、事务内禁副作用等
2. **spec-sync-check.sh** — spec/代码一致性提醒
   - 检测 `docs/specs/active/` 是否存在进行中需求
   - 提示是否需要同步更新 tasks / verification / findings

## 失败处理

- 当前所有检查为 **warning-only**，不阻断 Agent 后续动作
- 业务域确认后可在脚本中加入 `exit 1` 触发严格阻断（同时需在评审环节确认）

## 扩展指引

- 新增检查脚本统一放在 `docs/harness/linters/`，并在 `.claude/settings.json` 的 `PostToolUse` 数组中追加 entry
- 检查输出建议使用 `[check-name]` 前缀，便于日志聚合
