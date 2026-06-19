# Hooks 总览

> Open Harness V2 在三个层次上提供"卡口"：

| 层次 | 文件 | 触发 |
|------|------|------|
| Runtime hook | `post-action.md` | PostToolUse（Write/Edit/MultiEdit）后由 `.claude/settings.json` 自动触发 |
| Workflow gate | `cr-checklist.md` | `/openharness:review` 与 `/openharness:verify` 阶段使用 |
| 约束执行脚本 | `../harness/linters/*.sh` | 由 runtime hook 调用 |

## 当前生效配置

`.claude/settings.json` 中已注册：

```json
"hooks": {
  "PostToolUse": [
    {
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [
        { "type": "command", "command": "bash docs/harness/linters/invariant-check.sh 2>&1 | head -50" },
        { "type": "command", "command": "bash docs/harness/linters/spec-sync-check.sh 2>&1 | head -50" }
      ]
    }
  ]
}
```

> greenfield 阶段：linter 默认 warning-only，不阻断写操作。业务域确认后可按需收紧。
