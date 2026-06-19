# AgentCron — Agent 工作入口

> Open Harness V2 | 2026-06-18

## 项目概述

| 项目 | 内容 |
|------|------|
| 语言 | <!-- TODO: 待确认 --> |
| 框架 | <!-- TODO: 待确认 --> |
| 数据库 | <!-- TODO: 待确认 --> |
| 缓存 | <!-- TODO: 待确认 --> |
| 消息队列 | <!-- TODO: 待确认 --> |
| 架构风格 | <!-- TODO: 待确认 --> |
| 业务领域 | <!-- TODO: 待确认 --> |

> 当前仓库为 **greenfield** 项目骨架，尚无业务代码，技术栈与业务领域待评审基线后填充。

## 目录导航

```
docs/
├── harness/          # 约束层（必须遵守）
│   ├── index.md          ← 唯一索引（索引所有叶子文件）
│   ├── invariants/       ← 业务不变量
│   ├── architecture/     ← 架构约束
│   ├── infrastructure/   ← 技术规范
│   └── linters/          ← 自动化检查
├── knowledge/        # 知识库（系统现状）
│   ├── index.md              ← 唯一索引（索引所有叶子文件）
│   ├── project-context.md    ← 项目上下文（propose/review 必读）
│   ├── architecture.md       ← 系统架构（待 scan-tech 或人工填充）
│   ├── domain-model.md       ← 领域模型（待 scan-service 或人工填充）
│   ├── service-boundary.md   ← 服务职责边界（待 scan-boundary 或人工填充）
│   ├── service-meta.yaml     ← 服务元数据
│   ├── domain-mapping.md     ← 领域名称映射
│   ├── api/                  ← 接口文档
│   ├── database/             ← 数据库文档
│   ├── prd/                  ← 产品需求归档
│   └── exp/                  ← 经验总结
├── specs/            # 工作区域
│   ├── active/           ← 进行中的需求
│   └── completed/        ← 已完成的需求
└── hooks/            # 审查机制
    ├── index.md          ← Hook 配置入口
    ├── post-action.md    ← 动作后检查
    └── cr-checklist.md   ← CR 检查清单
```

## 关键约束速览

> 完整约束见 [docs/harness/index.md](docs/harness/index.md)

- **BIZ-001** 核心业务状态流转必须满足业务不变量约束（待业务域确认后细化）
- **API-001** 对外接口必须实现幂等性，写操作必须接收业务唯一 ID
- **SEC-001** 接口必须验证用户权限，禁止越权访问；敏感字段必须 KMS 加密
- **DB-001** 禁止 `SELECT *`、禁止物理删除业务数据，统一软删除
- **LOG-001** 业务日志必须 kv 格式且能通过 traceId 串联完整调用链

> greenfield 项目：以上为 OpenHarness 默认底线，具体技术栈与业务规则需在首版基线评审后写入对应 invariants/infrastructure 文件。

## 常用命令

```bash
/openharness:propose <feature> <prd-path>   # Phase 1：生成 proposal/spec/design
/openharness:propose <feature> --continue   # Phase 2：生成 tasks/verification
/openharness:review [feature]               # 可选阶段文档 review / apply 后综合 review
/openharness:apply [feature]                # 执行实现（完成后自动 review）
/openharness:verify [feature]               # 独立验收
/openharness:archive [feature]              # 归档需求
/openharness:status                         # 项目健康度报告
/openharness:rollback [feature]             # 回退到指定 checkpoint
```

## Agent 工作规则

1. **每次任务开始前必须读取本文件**，了解项目概况
2. **harness 按需加载**：按 `reference/loading-protocol.md` 协议执行。先读 `docs/harness/index.md`，若 index 含「加载时机」列，逐行评估条件后只读命中的叶子；若无该列，根据已有描述和文件名推断相关性按需读取。读取后记录时间戳用于会话内去重
3. **knowledge 按需加载**：按 `reference/loading-protocol.md` 协议执行。先读 `docs/knowledge/index.md` 建立知识地图，逐行评估「加载时机」列选择相关文档。不得跳过知识入口直接凭经验推断系统现状
4. **不确定的信息通过交互问答确认**，不捏造
5. **新需求开发必须先生成 proposal + spec + design，并清理未确认项**，再进入执行准备与执行阶段
6. **greenfield 评审重点**：基线架构合理性、可扩展性、运维可行性；不以历史兼容性为主
