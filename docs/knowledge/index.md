# Knowledge 索引

> 服务：AgentCron | 模式：greenfield | 更新时间：2026-06-18
>
> 本文件是知识库**唯一入口**。Agent 加载时按下表「加载时机」逐行评估，命中才读对应叶子。

## 全部叶子文件索引

| 文件/目录 | 定位 | 加载时机 |
|---------|------|--------|
| `project-context.md` | 项目上下文（模式 / 业务域 / 架构风格 / 技术栈） | propose/review 必读 |
| `architecture.md` | 系统架构（技术栈、部署形态、模块关系） | 涉及架构改动、跨模块设计、新增中间件时 |
| `domain-model.md` | 领域模型（实体、状态机、事件流） | 涉及核心业务实体、状态变更、事件契约时 |
| `service-boundary.md` | 服务职责边界（核心定位、显性边界、上下游契约） | 涉及服务职责变化、跨服务调用、对外契约调整时 |
| `service-meta.yaml` | 服务元数据（owner / 上下游 / 事件 / 能力） | 跨服务编排、依赖图查询、平台对接时 |
| `domain-mapping.md` | 业务域别名映射 | 解析 PRD 中的产品别名时 |
| `api/index.md` | 接口文档清单 | 涉及对外接口设计、调用下游接口时 |
| `database/index.md` | 数据库表清单 | 涉及建表、改表、SQL 设计时 |
| `prd/index.md` | PRD 归档总览 | 回溯历史需求决策时 |
| `exp/index.md` | 经验沉淀总览 | 复盘、规避已知坑、复用最佳实践时 |

## greenfield 提醒

- 当前所有知识入口为占位骨架，多数字段为 `<!-- TODO: 待确认 -->`
- 在首版业务代码就位后，运行 `scan-tech` / `scan-db` / `scan-api` / `scan-service` / `scan-boundary` / `scan-service-meta` 重建知识
- propose / review 阶段如发现关键字段缺失，必须通过交互问答确认而非凭经验推断
