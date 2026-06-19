# AgentCron 技术设计文档

> 版本：1.0 | 日期：2026-06-19 | 状态：draft

## 1. 系统架构

### 1.1 整体定位

AgentCron 是 AI Coding Agent（Codex CLI、Claude Code 等）的定时/事件驱动执行平台，提供任务调度、执行管理、日志采集、产物归档和通知能力。面向小团队内部使用，MVP 阶段单节点部署。

### 1.2 技术栈

| 层 | 选型 | 理由 |
|---|------|------|
| 后端运行时 | Node.js 20+ / TypeScript | Agent CLI 均为 Node 生态，child_process 原生支持 |
| 后端框架 | Fastify | 高性能、插件体系成熟、原生 TypeScript 支持 |
| 前端 | Next.js 15 App Router + React 19 + TailwindCSS + shadcn/ui | 全栈 TS 统一，SSR/CSR 灵活切换 |
| ORM | Prisma | 类型安全、迁移管理、MySQL 支持好 |
| 数据库 | MySQL 8.0+ | 唯一存储层，兼任务队列（SKIP LOCKED） |
| 包管理 | pnpm workspaces | monorepo 管理 |

### 1.3 Monorepo 结构

```
AgentCron/
├── apps/
│   ├── api/                    # Fastify 后端
│   │   └── src/
│   │       ├── modules/        # 9 个业务模块
│   │       ├── plugins/        # Fastify 插件
│   │       └── index.ts        # 入口
│   └── web/                    # Next.js 前端
│       └── src/
│           ├── app/            # App Router 页面
│           └── components/     # UI 组件
├── packages/
│   └── shared/                 # 共享类型、常量、工具
│       └── src/
│           ├── types/
│           ├── constants/
│           └── utils/
├── prisma/
│   └── schema.prisma           # 数据模型
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### 1.4 核心模块（9 个）

| 模块 | 职责 |
|------|------|
| **HTTP API** | Fastify 路由，请求校验，响应序列化 |
| **TaskService** | 任务 CRUD，状态管理，调度参数维护 |
| **Scheduler** | 30s tick，扫描到期任务，创建 Run 记录 |
| **RunDispatcher** | 5s tick，`SELECT FOR UPDATE SKIP LOCKED` 竞争领取，分发执行 |
| **AgentRunner** | child_process.spawn 执行 Agent CLI，管理生命周期 |
| **CodexAdapter** | Codex CLI 命令构建、参数映射、输出解析 |
| **LogCollector** | 日志采集（buffer 1s/4KB flush）、SSE 流式推送 |
| **ArtifactStore** | 产物归档到本地磁盘，元数据入库 |
| **Notifier** | 执行结果通知（Webhook + 飞书机器人） |

### 1.5 单进程架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Fastify Process                          │
│                                                              │
│  ┌──────────┐   ┌───────────┐   ┌──────────────┐           │
│  │ HTTP API │   │ Scheduler │   │ RunDispatcher │           │
│  │          │   │ (30s tick) │   │  (5s tick)    │           │
│  └────┬─────┘   └─────┬─────┘   └──────┬───────┘           │
│       │               │                │                     │
│       ▼               ▼                ▼                     │
│  ┌──────────┐   ┌──────────┐   ┌─────────────┐             │
│  │TaskService│   │   Run    │   │ AgentRunner  │             │
│  └────┬─────┘   │  Queue   │   │ (spawn CLI)  │             │
│       │         │ (MySQL)  │   └──────┬───────┘             │
│       │         └──────────┘          │                      │
│       │                          ┌────┴────┐                 │
│       │                    ┌─────┤CodexAdpt├─────┐           │
│       │                    │     └─────────┘     │           │
│       ▼                    ▼                     ▼           │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐      │
│  │ Notifier │    │ LogCollector │    │ ArtifactStore │      │
│  └──────────┘    └──────────────┘    └───────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                     MySQL 8.0+                        │   │
│  │  Tasks │ Runs (queue) │ Logs │ Artifacts │ Sessions   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 数据模型

### 2.1 ER 关系

```
Task 1──N Run 1──N TaskRunLog
                1──N TaskRunArtifact
Session (独立实体，通过 Run.sessionId 关联)
```

### 2.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Task {
  id                 BigInt    @id @default(autoincrement())
  name               String    @db.VarChar(255)
  description        String?   @db.Text
  agentType          String    @map("agent_type") @db.VarChar(64)
  project            String?   @db.VarChar(255)
  taskPrompt         String    @map("task_prompt") @db.Text
  schedule           Json
  sessionPolicy      String    @map("session_policy") @db.VarChar(32)
  concurrencyPolicy  String    @default("skip_if_running") @map("concurrency_policy") @db.VarChar(32)
  environment        Json
  permissionPolicy   Json      @map("permission_policy")
  notificationConfig Json      @map("notification_config")
  timeoutSeconds     Int       @default(3600) @map("timeout_seconds")
  maxRetries         Int       @default(0) @map("max_retries")
  status             String    @db.VarChar(32)
  ownerId            BigInt    @map("owner_id")
  createdById        BigInt    @map("created_by_id")
  nextRunAt          DateTime? @map("next_run_at")
  lastRunAt          DateTime? @map("last_run_at")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")
  deletedAt          DateTime? @map("deleted_at")
  runs               Run[]

  @@index([status, nextRunAt])
  @@index([ownerId, deletedAt])
  @@map("tasks")
}

model Run {
  id            BigInt    @id @default(autoincrement())
  taskId        BigInt    @map("task_id")
  sessionId     String?   @map("session_id") @db.VarChar(255)
  trigger       String    @db.VarChar(32)
  triggeredById BigInt?   @map("triggered_by_id")
  status        String    @db.VarChar(32)
  startedAt     DateTime? @map("started_at")
  finishedAt    DateTime? @map("finished_at")
  duration      Int?
  resultSummary String?   @map("result_summary") @db.Text
  errorMessage  String?   @map("error_message") @db.Text
  riskLevel     String?   @map("risk_level") @db.VarChar(16)
  needsReview   Boolean   @default(false) @map("needs_review")
  artifactLinks Json?     @map("artifact_links")
  notifyStatus  String?   @map("notify_status") @db.VarChar(32)
  scheduledFor  DateTime  @map("scheduled_for")
  claimedBy     String?   @map("claimed_by") @db.VarChar(64)
  claimedAt     DateTime? @map("claimed_at")
  heartbeatAt   DateTime? @map("heartbeat_at")
  attemptNo     Int       @default(1) @map("attempt_no")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  task          Task      @relation(fields: [taskId], references: [id])
  logs          TaskRunLog[]
  artifacts     TaskRunArtifact[]

  @@index([status, scheduledFor])
  @@index([taskId, createdAt])
  @@index([claimedBy, heartbeatAt])
  @@map("runs")
}

model TaskRunLog {
  id        BigInt   @id @default(autoincrement())
  runId     BigInt   @map("run_id")
  logType   String   @map("log_type") @db.VarChar(32)
  content   String?  @db.Text
  metadata  Json?
  createdAt DateTime @default(now()) @map("created_at")
  run       Run      @relation(fields: [runId], references: [id])

  @@index([runId, createdAt])
  @@map("task_run_logs")
}

model TaskRunArtifact {
  id           BigInt   @id @default(autoincrement())
  runId        BigInt   @map("run_id")
  artifactType String   @map("artifact_type") @db.VarChar(64)
  name         String   @db.VarChar(255)
  url          String?  @db.Text
  storagePath  String?  @map("storage_path") @db.VarChar(512)
  metadata     Json?
  createdAt    DateTime @default(now()) @map("created_at")
  run          Run      @relation(fields: [runId], references: [id])

  @@index([runId])
  @@map("task_run_artifacts")
}

model Session {
  id        String   @id @db.VarChar(255)
  agentType String   @map("agent_type") @db.VarChar(64)
  baseDir   String?  @map("base_dir") @db.Text
  status    String   @db.VarChar(32)
  directory String?  @db.Text
  metadata  Json?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("sessions")
}

model User {
  id           BigInt   @id @default(autoincrement())
  username     String   @unique @db.VarChar(128)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  role         String   @default("member") @db.VarChar(32)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

### 2.3 Run 状态机

```
                    ┌─────────┐
           ┌───────│ PENDING  │───────┐
           │       └────┬────┘       │
           │            │             │
     (skip/queue)  (dispatch)    (cancel)
           │            │             │
           ▼            ▼             ▼
    ┌──────────┐  ┌─────────┐  ┌───────────┐
    │ SKIPPED  │  │ RUNNING │  │ CANCELLED │
    └──────────┘  └────┬────┘  └───────────┘
                       │
          ┌────────────┼────────────┬─────────────┐
          │            │            │             │
          ▼            ▼            ▼             ▼
    ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐
    │ SUCCESS │ │  FAILED  │ │ TIMEOUT │ │ NEEDS_REVIEW │
    └─────────┘ └──────────┘ └─────────┘ └──────────────┘
          │            │            │             │
          ▼            ▼            ▼             ▼
    ┌───────────────┐  ┌───────────┐  ┌──────────────────┐
    │PARTIAL_SUCCESS│  │NO_ACTION  │  │  SYSTEM_ERROR    │
    └───────────────┘  └───────────┘  └──────────────────┘
```

**11 种状态**：PENDING / RUNNING / SUCCESS / FAILED / TIMEOUT / CANCELLED / NEEDS_REVIEW / PARTIAL_SUCCESS / NO_ACTION / SYSTEM_ERROR / SKIPPED

**所有状态转换统一通过 `runStateMachine.transition(runId, targetStatus, context)` 函数**，禁止直接 UPDATE status。

**合法转换表**：

| 当前状态 | 可转换到 |
|---------|---------|
| PENDING | RUNNING, CANCELLED, SKIPPED |
| RUNNING | SUCCESS, FAILED, TIMEOUT, CANCELLED, NEEDS_REVIEW, PARTIAL_SUCCESS, NO_ACTION, SYSTEM_ERROR |
| 终态（其余） | 不可转换 |

### 2.4 日志模型

日志按**事件粒度**记录，非逐行记录：

| logType | 含义 | 示例 |
|---------|------|------|
| `agent_output` | Agent 标准输出（buffer 合并） | 一段代码生成输出 |
| `agent_error` | Agent 错误输出 | stderr 内容 |
| `tool_call` | Agent 调用的工具 | `{"tool": "edit", "file": "src/index.ts"}` |
| `system` | 平台系统事件 | 状态变更、超时检测 |
| `heartbeat` | 心跳 | `{"ts": "...", "pid": 12345}` |

**Buffer 策略**：1 秒或 4KB 先到先 flush，防止高频写入打爆数据库。

**SSE 流式推送**：`GET /api/runs/:id/logs/stream` 返回 `text/event-stream`，新日志 flush 时同步推送到已连接的 SSE 客户端。

---

## 3. 调度与执行流程

### 3.1 Scheduler（调度器）

- **tick 间隔**：30 秒
- **职责**：扫描 `tasks` 表中 `status = 'active' AND next_run_at <= NOW()` 的记录
- **动作**：
  1. 解析 cron 表达式，计算下次执行时间并更新 `next_run_at`
  2. 检查并发策略（skip_if_running / queue_if_running / allow_parallel）
  3. 创建 Run 记录，状态 = PENDING，`scheduled_for = NOW()`

### 3.2 RunDispatcher（分发器）

- **tick 间隔**：5 秒
- **竞争领取**（MySQL 8 SKIP LOCKED）：

```sql
START TRANSACTION;

SELECT id FROM runs
WHERE status = 'PENDING'
  AND scheduled_for <= NOW()
ORDER BY scheduled_for ASC
LIMIT :batchSize
FOR UPDATE SKIP LOCKED;

UPDATE runs
SET status = 'RUNNING',
    claimed_by = :workerId,
    claimed_at = NOW(),
    heartbeat_at = NOW(),
    started_at = NOW()
WHERE id IN (:claimedIds);

COMMIT;
```

- **batchSize**：默认 5，可配置
- **并发上限**：默认 3 个同时执行的 Agent 进程，可配置

### 3.3 Run 执行生命周期（7 步）

```
1. 准备工作区   → mkdir <DATA_DIR>/workspaces/{runId}/
2. 解析 Session → 按 sessionPolicy 查找或创建 session
3. 构建命令     → CodexAdapter 构造 CLI 命令与参数
4. 启动进程     → child_process.spawn(command, args, { cwd, env })
5. 采集输出     → stdout/stderr → LogCollector → buffer → flush DB + SSE
6. 等待完成     → exitCode / signal / timeout
7. 后处理       → 状态转换 + 产物归档 + 通知发送 + 工作区标记
```

### 3.4 心跳与故障恢复

| 参数 | 值 |
|------|---|
| 心跳间隔 | 30 秒 |
| 恢复阈值 | 180 秒 |
| 超时默认 | 3600 秒（60 分钟） |
| 超时终止 | SIGTERM → 5s grace → SIGKILL |

**4 种故障场景**：

| 场景 | 检测 | 恢复 |
|------|------|------|
| Agent 进程崩溃 | child_process `exit` 事件 | 立即标记 FAILED |
| 进程卡死（超时） | 定时检查 `startedAt + timeoutSeconds` | SIGTERM → SIGKILL → 标记 TIMEOUT |
| 平台进程重启 | 启动时扫描 `status=RUNNING AND heartbeat_at < NOW() - 180s` | 标记 SYSTEM_ERROR，若 `attemptNo < maxRetries` 则创建重试 Run |
| 数据库连接断开 | Prisma 连接池错误 | 指数退避重连 |

### 3.5 并发策略

| 策略 | 行为 |
|------|------|
| `skip_if_running`（默认） | 若该 Task 有 RUNNING 状态的 Run，Scheduler 跳过本次，不创建 Run |
| `queue_if_running` | 创建 Run（PENDING），排队等待前序完成 |
| `allow_parallel` | 无限制，允许同一 Task 多个 Run 并行 |

### 3.6 Session 策略

| 策略 | 行为 |
|------|------|
| `always_new` | 每次创建全新 session |
| `reuse_fixed` | 复用指定 session ID，不存在则创建 |
| `reuse_last_success` | 查找该 Task 最近一次 SUCCESS 的 Run 所用 session，复用 |

### 3.7 工作区管理

- **路径**：`<DATA_DIR>/workspaces/{runId}/`
- **隔离方式**：每次 Run 独立目录，通过 `cwd` 参数传给子进程
- **清理策略**：7 天保留期，定时任务扫描删除过期工作区
- **产物归档**：Run 完成后将指定文件（diff、log、report）复制到 `<DATA_DIR>/artifacts/{runId}/`

---

## 4. 错误处理与可观测性

### 4.1 三层错误模型

| 层 | 类型 | HTTP 状态码 | 处理方式 |
|---|------|------------|---------|
| 业务层 | 参数校验、权限不足、资源不存在 | 4xx | 返回结构化错误，不重试 |
| 执行层 | Agent 执行失败、超时、需审查 | — | Run 状态机转换，按配置通知 |
| 系统层 | 未捕获异常、数据库故障、OOM | 5xx | 自动重试 + 告警 |

### 4.2 自动重试（仅系统错误）

- **触发条件**：Run 状态变为 SYSTEM_ERROR 且 `attemptNo < maxRetries`
- **退避策略**：指数退避 30s → 2m → 8m（`30 * 4^(attempt-1)` 秒）
- **最大重试**：3 次（Task 级配置，默认 0 = 不重试）
- **重试实现**：创建新 Run 记录，`attemptNo = prev + 1`，`scheduled_for = NOW() + backoff`

### 4.3 安全设计

**加密存储**：
- 算法：AES-256-GCM
- 密钥来源：`MASTER_KEY` 环境变量
- 加密字段：`task_prompt`、`environment`（含 API keys）、`permission_policy`
- 存储格式：`enc:v1:{iv}:{ciphertext}:{tag}`

**日志脱敏**：
- 正则匹配 API key 模式（`sk-...`、`key-...`、`ghp_...`、`Bearer ...`）
- 替换为 `[REDACTED]`
- 在 LogCollector flush 前执行

**权限控制**：
- JWT token（24h 有效期）
- 两种角色：admin（全部权限）、member（仅操作自己的 Task）
- 接口级权限校验：member 只能 CRUD 自己的 Task，查看自己的 Run

### 4.4 可观测性

**日志格式**（KV 结构）：
```
ts=2026-06-19T10:30:00Z level=info module=scheduler traceId=abc123 msg="tick completed" tasksScanned=42 runsCreated=3
```

**traceId 传播**：
- HTTP 请求入口生成 traceId（取 `X-Trace-Id` header 或自动生成 UUID）
- 通过 Fastify request context 贯穿整个请求链路
- Scheduler/Dispatcher tick 各自生成 traceId
- Run 级别的 traceId 记录到 Run.metadata

**管理端点**：

| 端点 | 用途 |
|------|------|
| `GET /api/admin/health` | 健康检查（DB 连接、磁盘空间） |
| `GET /api/admin/metrics` | 运行指标（活跃 Run 数、队列深度、成功率） |
| `GET /api/admin/queue` | 队列状态（PENDING/RUNNING 分布） |

---

## 5. Web UI 与 API

### 5.1 页面设计（5 页）

| 页面 | 路由 | 核心功能 |
|------|------|---------|
| 登录 | `/login` | 用户名密码登录 |
| 任务列表 | `/tasks` | 任务卡片/表格、状态筛选、快捷操作（启用/暂停/触发） |
| 任务详情 | `/tasks/:id` | 任务配置查看与编辑、执行历史列表 |
| Run 详情 | `/runs/:id` | 状态时间线、实时日志流（SSE）、产物列表与下载 |
| 新建/编辑任务 | `/tasks/new`、`/tasks/:id/edit` | 表单：基本信息、Prompt 编辑器、Cron 表达式、通知配置 |

### 5.2 API 路由

```
# 任务管理
POST   /api/tasks                     创建任务
GET    /api/tasks                     任务列表（分页、筛选）
GET    /api/tasks/:id                 任务详情
PATCH  /api/tasks/:id                 更新任务
DELETE /api/tasks/:id                 软删除
POST   /api/tasks/:id:enable          启用
POST   /api/tasks/:id:disable         暂停
POST   /api/tasks/:id:trigger         手动触发

# 执行记录
GET    /api/tasks/:id/runs            某任务的执行历史
GET    /api/runs/:id                  Run 详情
GET    /api/runs/:id/logs             Run 日志（分页）
GET    /api/runs/:id/logs/stream      SSE 流式日志
POST   /api/runs/:id:rerun            重跑
POST   /api/runs/:id:cancel           取消执行
GET    /api/runs/:id/artifacts/:aid   产物下载

# 管理
GET    /api/admin/health              健康检查
GET    /api/admin/metrics             运行指标
GET    /api/admin/queue               队列状态

# 认证
POST   /api/auth/login                登录
POST   /api/auth/logout               登出
GET    /api/auth/me                   当前用户信息
```

### 5.3 请求/响应约定

**统一响应格式**：
```json
{
  "code": 0,
  "data": { ... },
  "message": "ok",
  "traceId": "abc-123"
}
```

**错误响应**：
```json
{
  "code": 40001,
  "data": null,
  "message": "Task not found",
  "traceId": "abc-123"
}
```

**分页**：
```json
{
  "code": 0,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

**幂等性**：写接口通过 `Idempotency-Key` 请求头实现，服务端基于该 key 去重（24h 窗口）。

---

## 6. 通知系统

### 6.1 支持渠道

| 渠道 | 实现方式 |
|------|---------|
| Webhook | POST JSON 到用户配置的 URL |
| 飞书机器人 | 飞书 Webhook URL + 卡片消息模板 |

### 6.2 通知触发时机

- Run 状态变为终态（SUCCESS / FAILED / TIMEOUT / NEEDS_REVIEW / SYSTEM_ERROR）时触发
- Task 级配置：可选择哪些状态触发通知
- 通知发送失败记录到 `Run.notifyStatus`，不阻塞主流程

### 6.3 通知内容

```json
{
  "taskName": "daily-code-review",
  "runId": 12345,
  "status": "FAILED",
  "duration": 120,
  "errorMessage": "Agent exited with code 1",
  "resultSummary": "...",
  "runUrl": "https://agentcron.example.com/runs/12345",
  "triggeredAt": "2026-06-19T10:30:00Z"
}
```

---

## 7. 测试策略

### 7.1 测试分层

| 层 | 工具 | 覆盖范围 |
|---|------|---------|
| 单元测试 | Vitest | 状态机、Cron 解析、加密/脱敏、适配器 |
| 集成测试 | Vitest + Testcontainers（MySQL） | TaskService、RunDispatcher、LogCollector |
| E2E 测试 | Playwright | 登录→创建任务→触发→查看日志 |

### 7.2 测试辅助

- **MockCodexAdapter**：模拟 Agent CLI 行为，返回可控的输出和退出码
- **Testcontainers**：集成测试使用真实 MySQL 容器，Prisma migrate 自动建表

---

## 8. 部署与运维

### 8.1 部署方式

单节点 Docker Compose：

```yaml
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: mysql://...
      MASTER_KEY: ${MASTER_KEY}
      DATA_DIR: /data
    volumes:
      - agentcron-data:/data

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports: ["3001:3000"]

  mysql:
    image: mysql:8.0
    ports: ["3306:3306"]
    volumes:
      - mysql-data:/var/lib/mysql
```

### 8.2 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | MySQL 连接串 |
| `MASTER_KEY` | 是 | AES-256 主密钥（32 字节 hex） |
| `DATA_DIR` | 否 | 数据目录，默认 `./data` |
| `JWT_SECRET` | 是 | JWT 签名密钥 |
| `PORT` | 否 | API 端口，默认 3000 |
| `MAX_CONCURRENT_RUNS` | 否 | 最大并发 Run 数，默认 3 |
| `SCHEDULER_INTERVAL_MS` | 否 | Scheduler tick 间隔，默认 30000 |
| `DISPATCHER_INTERVAL_MS` | 否 | Dispatcher tick 间隔，默认 5000 |

---

## 9. MVP 范围

### 9.1 包含

- 任务 CRUD 与调度（Cron 表达式）
- Codex CLI 适配器
- 执行管理（状态机、心跳、超时、取消）
- 日志采集与 SSE 流式推送
- 产物归档与下载
- 通知集成（Webhook + 飞书）
- Session 复用（3 种策略）
- 手动触发与重跑
- 并发与防重策略（3 种）
- JWT 认证与角色权限
- 管理端点（health/metrics/queue）

### 9.2 不包含（后续迭代）

- Triage / 风险评级
- 多 Agent 类型适配（Claude Code 等）
- 多节点水平扩展
- GitHub / GitLab 事件触发
- SSO 集成
- 审批流
- 操作审计日志

---

## 10. 关键设计决策记录

| # | 决策 | 理由 |
|---|------|------|
| D1 | MySQL 兼任任务队列（SKIP LOCKED） | 减少组件依赖，小团队单节点足够 |
| D2 | 单进程架构 | MVP 阶段简化部署与调试，Scheduler/Dispatcher 作为内嵌定时器 |
| D3 | 事件粒度日志（非逐行） | 减少 DB 写入频率，buffer 合并降低 I/O |
| D4 | 仅系统错误自动重试 | 业务失败（Agent 返回错误）由人决定是否重跑 |
| D5 | 恢复阈值 180s | 允许临时网络抖动，避免误判进程存活 |
| D6 | 默认超时 60 分钟 | Agent 任务通常耗时较长（代码生成、审查） |
| D7 | API 前缀 `/api/tasks` | 比 PRD 的 `/api/agent-tasks` 更简洁 |
| D8 | PATCH 更新而非 PUT | 支持部分更新，前端更灵活 |
| D9 | Cancel 而非 Pause | Agent 子进程无法暂停/恢复，Cancel 语义更准确 |
| D10 | isolated_workspace 而非 Docker 隔离 | MVP 阶段避免 Docker-in-Docker 复杂度 |
