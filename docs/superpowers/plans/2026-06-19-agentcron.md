# AgentCron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a scheduled execution platform for AI Coding Agents (Codex CLI) with task management, cron scheduling, execution lifecycle, log streaming, artifact storage, and notifications.

**Architecture:** Single Node.js process monorepo. Fastify API serves HTTP routes while embedding Scheduler (30s tick) and RunDispatcher (5s tick, MySQL SKIP LOCKED) as internal timers. Agent CLI runs as child_process.spawn. Next.js frontend for management UI.

**Tech Stack:** Node.js 20+ / TypeScript / Fastify / Next.js 15 / Prisma / MySQL 8.0+ / Vitest / pnpm workspaces / TailwindCSS / shadcn/ui

---

## File Structure

```
AgentCron/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types.ts
│           ├── constants.ts
│           ├── run-states.ts
│           ├── crypto.ts
│           ├── sanitize.ts
│           └── cron-utils.ts
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── config.ts
│   │       ├── logger.ts
│   │       ├── plugins/
│   │       │   ├── prisma.ts
│   │       │   ├── auth.ts
│   │       │   ├── trace-id.ts
│   │       │   └── error-handler.ts
│   │       └── modules/
│   │           ├── auth/
│   │           │   ├── auth.service.ts
│   │           │   ├── auth.routes.ts
│   │           │   └── auth.schema.ts
│   │           ├── task/
│   │           │   ├── task.service.ts
│   │           │   ├── task.routes.ts
│   │           │   └── task.schema.ts
│   │           ├── run/
│   │           │   ├── run.service.ts
│   │           │   ├── run.routes.ts
│   │           │   ├── run.schema.ts
│   │           │   └── run-state-machine.ts
│   │           ├── scheduler/
│   │           │   └── scheduler.service.ts
│   │           ├── dispatcher/
│   │           │   └── dispatcher.service.ts
│   │           ├── runner/
│   │           │   ├── agent-runner.ts
│   │           │   ├── codex-adapter.ts
│   │           │   └── mock-adapter.ts
│   │           ├── log-collector/
│   │           │   └── log-collector.ts
│   │           ├── artifact/
│   │           │   └── artifact-store.ts
│   │           ├── notifier/
│   │           │   ├── notifier.ts
│   │           │   ├── webhook-channel.ts
│   │           │   └── feishu-channel.ts
│   │           └── admin/
│   │               ├── admin.service.ts
│   │               └── admin.routes.ts
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── page.tsx
│           │   ├── login/
│           │   │   └── page.tsx
│           │   ├── tasks/
│           │   │   ├── page.tsx
│           │   │   ├── new/
│           │   │   │   └── page.tsx
│           │   │   └── [id]/
│           │   │       ├── page.tsx
│           │   │       └── edit/
│           │   │           └── page.tsx
│           │   └── runs/
│           │       └── [id]/
│           │           └── page.tsx
│           ├── components/
│           │   ├── nav-bar.tsx
│           │   ├── task-card.tsx
│           │   ├── task-form.tsx
│           │   ├── run-timeline.tsx
│           │   ├── log-viewer.tsx
│           │   └── artifact-list.tsx
│           └── lib/
│               ├── api-client.ts
│               ├── auth-context.tsx
│               └── use-sse.ts
└── tests/
    └── api/
        ├── helpers/
        │   └── setup.ts
        ├── unit/
        │   ├── run-states.test.ts
        │   ├── crypto.test.ts
        │   ├── sanitize.test.ts
        │   ├── cron-utils.test.ts
        │   └── run-state-machine.test.ts
        └── integration/
            ├── task.test.ts
            ├── run.test.ts
            ├── scheduler.test.ts
            ├── dispatcher.test.ts
            ├── log-collector.test.ts
            ├── artifact-store.test.ts
            └── notifier.test.ts
```

---

### Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`

- [ ] **Step 1: Create root package.json and workspace config**

```json
// package.json
{
  "name": "agentcron",
  "private": true,
  "scripts": {
    "dev:api": "pnpm --filter @agentcron/api dev",
    "dev:web": "pnpm --filter @agentcron/web dev",
    "build": "pnpm -r build",
    "test": "pnpm --filter @agentcron/api test",
    "test:unit": "pnpm --filter @agentcron/api test:unit",
    "db:migrate": "pnpm --filter @agentcron/api db:migrate",
    "db:generate": "pnpm --filter @agentcron/api db:generate",
    "db:seed": "pnpm --filter @agentcron/api db:seed",
    "lint": "pnpm -r lint"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 3: Create packages/shared configs**

```json
// packages/shared/package.json
{
  "name": "@agentcron/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  }
}
```

```json
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create apps/api configs**

```json
// apps/api/package.json
{
  "name": "@agentcron/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:watch": "vitest",
    "lint": "tsc --noEmit",
    "db:migrate": "prisma migrate dev --schema=../../prisma/schema.prisma",
    "db:generate": "prisma generate --schema=../../prisma/schema.prisma",
    "db:seed": "tsx ../../prisma/seed.ts"
  },
  "dependencies": {
    "@agentcron/shared": "workspace:*",
    "@prisma/client": "^6.0.0",
    "fastify": "^5.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/jwt": "^9.0.0",
    "bcrypt": "^5.1.1",
    "cron-parser": "^5.0.0",
    "zod": "^3.23.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/uuid": "^10.0.0",
    "prisma": "^6.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

```json
// apps/api/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create apps/web configs**

```json
// apps/web/package.json
{
  "name": "@agentcron/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@agentcron/shared": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0"
  }
}
```

```json
// apps/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Create .gitignore and .env.example**

```gitignore
# .gitignore
node_modules/
dist/
.next/
.env
.env.local
*.log
data/
```

```bash
# .env.example
DATABASE_URL="mysql://root:password@localhost:3306/agentcron"
MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
JWT_SECRET="your-jwt-secret-here"
DATA_DIR="./data"
PORT=3000
MAX_CONCURRENT_RUNS=3
SCHEDULER_INTERVAL_MS=30000
DISPATCHER_INTERVAL_MS=5000
```

- [ ] **Step 7: Install dependencies and verify workspace**

Run: `pnpm install`
Expected: All three workspaces linked, no errors.

Run: `pnpm -r exec -- echo "workspace ok"`
Expected: Output from all 3 packages.

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold monorepo with pnpm workspaces"
```

---

### Task 2: Prisma Schema & Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `apps/api/vitest.config.ts`

- [ ] **Step 1: Write Prisma schema**

```prisma
// prisma/schema.prisma
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

model IdempotencyKey {
  id        BigInt   @id @default(autoincrement())
  key       String   @unique @db.VarChar(255)
  response  Json
  createdAt DateTime @default(now()) @map("created_at")

  @@map("idempotency_keys")
}
```

- [ ] **Step 2: Write seed script**

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: hash,
      role: "admin",
    },
  });
  console.log("Seeded admin user (admin / admin123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Create vitest config for api**

```typescript
// apps/api/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: "../../",
    include: ["tests/api/**/*.test.ts"],
    globals: true,
    testTimeout: 30000,
  },
});
```

- [ ] **Step 4: Generate Prisma client and verify**

Run: `pnpm --filter @agentcron/api db:generate`
Expected: Prisma Client generated successfully.

- [ ] **Step 5: Start MySQL and run migration**

Run: `docker compose up -d mysql` (assumes docker-compose.yml from Task 18)

If MySQL isn't ready yet, create a minimal docker-compose.yml first:
```yaml
# docker-compose.yml (minimal, expanded in Task 18)
services:
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: agentcron
    volumes:
      - mysql-data:/var/lib/mysql
volumes:
  mysql-data:
```

Run: `pnpm --filter @agentcron/api db:migrate -- --name init`
Expected: Migration applied successfully.

Run: `pnpm --filter @agentcron/api db:seed`
Expected: "Seeded admin user" output.

- [ ] **Step 6: Commit**

```bash
git add prisma/ docker-compose.yml apps/api/vitest.config.ts
git commit -m "feat: add Prisma schema with 6 tables and seed script"
```

---

### Task 3: Shared Package — Types & Constants

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/run-states.ts`
- Create: `packages/shared/src/index.ts`
- Test: `tests/api/unit/run-states.test.ts`

- [ ] **Step 1: Write the failing test for run states**

```typescript
// tests/api/unit/run-states.test.ts
import { describe, it, expect } from "vitest";
import {
  RunStatus,
  TERMINAL_STATES,
  VALID_TRANSITIONS,
  isTerminal,
  canTransition,
} from "@agentcron/shared";

describe("RunStatus", () => {
  it("defines all 11 states", () => {
    expect(Object.keys(RunStatus)).toHaveLength(11);
  });

  it("marks terminal states correctly", () => {
    expect(isTerminal(RunStatus.SUCCESS)).toBe(true);
    expect(isTerminal(RunStatus.FAILED)).toBe(true);
    expect(isTerminal(RunStatus.TIMEOUT)).toBe(true);
    expect(isTerminal(RunStatus.CANCELLED)).toBe(true);
    expect(isTerminal(RunStatus.NEEDS_REVIEW)).toBe(true);
    expect(isTerminal(RunStatus.PARTIAL_SUCCESS)).toBe(true);
    expect(isTerminal(RunStatus.NO_ACTION)).toBe(true);
    expect(isTerminal(RunStatus.SYSTEM_ERROR)).toBe(true);
    expect(isTerminal(RunStatus.SKIPPED)).toBe(true);
    expect(isTerminal(RunStatus.PENDING)).toBe(false);
    expect(isTerminal(RunStatus.RUNNING)).toBe(false);
  });

  it("allows PENDING → RUNNING", () => {
    expect(canTransition(RunStatus.PENDING, RunStatus.RUNNING)).toBe(true);
  });

  it("allows PENDING → CANCELLED", () => {
    expect(canTransition(RunStatus.PENDING, RunStatus.CANCELLED)).toBe(true);
  });

  it("allows PENDING → SKIPPED", () => {
    expect(canTransition(RunStatus.PENDING, RunStatus.SKIPPED)).toBe(true);
  });

  it("allows RUNNING → all terminal states except SKIPPED", () => {
    const fromRunning = [
      RunStatus.SUCCESS,
      RunStatus.FAILED,
      RunStatus.TIMEOUT,
      RunStatus.CANCELLED,
      RunStatus.NEEDS_REVIEW,
      RunStatus.PARTIAL_SUCCESS,
      RunStatus.NO_ACTION,
      RunStatus.SYSTEM_ERROR,
    ];
    for (const target of fromRunning) {
      expect(canTransition(RunStatus.RUNNING, target)).toBe(true);
    }
  });

  it("rejects transitions from terminal states", () => {
    expect(canTransition(RunStatus.SUCCESS, RunStatus.RUNNING)).toBe(false);
    expect(canTransition(RunStatus.FAILED, RunStatus.PENDING)).toBe(false);
  });

  it("rejects PENDING → SUCCESS (must go through RUNNING)", () => {
    expect(canTransition(RunStatus.PENDING, RunStatus.SUCCESS)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test:unit -- tests/api/unit/run-states.test.ts`
Expected: FAIL — cannot resolve `@agentcron/shared`

- [ ] **Step 3: Implement types, constants, and run-states**

```typescript
// packages/shared/src/types.ts
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
  traceId: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type TaskStatus = "active" | "paused" | "deleted";

export type TriggerType = "cron" | "manual" | "retry";

export type SessionPolicy = "always_new" | "reuse_fixed" | "reuse_last_success";

export type ConcurrencyPolicy =
  | "skip_if_running"
  | "queue_if_running"
  | "allow_parallel";

export type LogType =
  | "agent_output"
  | "agent_error"
  | "tool_call"
  | "system"
  | "heartbeat";

export type UserRole = "admin" | "member";

export interface ScheduleConfig {
  cron: string;
  timezone?: string;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  onStatuses: string[];
}

export interface NotificationChannel {
  type: "webhook" | "feishu";
  url: string;
  secret?: string;
}

export interface JwtPayload {
  userId: bigint;
  username: string;
  role: UserRole;
}
```

```typescript
// packages/shared/src/constants.ts
export const DEFAULTS = {
  TIMEOUT_SECONDS: 3600,
  MAX_RETRIES: 0,
  MAX_CONCURRENT_RUNS: 3,
  SCHEDULER_INTERVAL_MS: 30000,
  DISPATCHER_INTERVAL_MS: 5000,
  DISPATCHER_BATCH_SIZE: 5,
  HEARTBEAT_INTERVAL_MS: 30000,
  HEARTBEAT_RECOVERY_THRESHOLD_S: 180,
  GRACEFUL_SHUTDOWN_MS: 5000,
  LOG_BUFFER_INTERVAL_MS: 1000,
  LOG_BUFFER_MAX_BYTES: 4096,
  WORKSPACE_RETENTION_DAYS: 7,
  JWT_EXPIRES_IN: "24h",
  PAGE_SIZE: 20,
  IDEMPOTENCY_WINDOW_HOURS: 24,
  RETRY_BACKOFF_BASE_S: 30,
  RETRY_BACKOFF_MULTIPLIER: 4,
} as const;
```

```typescript
// packages/shared/src/run-states.ts
export const RunStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  TIMEOUT: "TIMEOUT",
  CANCELLED: "CANCELLED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  PARTIAL_SUCCESS: "PARTIAL_SUCCESS",
  NO_ACTION: "NO_ACTION",
  SYSTEM_ERROR: "SYSTEM_ERROR",
  SKIPPED: "SKIPPED",
} as const;

export type RunStatusType = (typeof RunStatus)[keyof typeof RunStatus];

export const TERMINAL_STATES: ReadonlySet<string> = new Set([
  RunStatus.SUCCESS,
  RunStatus.FAILED,
  RunStatus.TIMEOUT,
  RunStatus.CANCELLED,
  RunStatus.NEEDS_REVIEW,
  RunStatus.PARTIAL_SUCCESS,
  RunStatus.NO_ACTION,
  RunStatus.SYSTEM_ERROR,
  RunStatus.SKIPPED,
]);

export const VALID_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  [RunStatus.PENDING]: new Set([
    RunStatus.RUNNING,
    RunStatus.CANCELLED,
    RunStatus.SKIPPED,
  ]),
  [RunStatus.RUNNING]: new Set([
    RunStatus.SUCCESS,
    RunStatus.FAILED,
    RunStatus.TIMEOUT,
    RunStatus.CANCELLED,
    RunStatus.NEEDS_REVIEW,
    RunStatus.PARTIAL_SUCCESS,
    RunStatus.NO_ACTION,
    RunStatus.SYSTEM_ERROR,
  ]),
};

export function isTerminal(status: string): boolean {
  return TERMINAL_STATES.has(status);
}

export function canTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.has(to) : false;
}
```

```typescript
// packages/shared/src/index.ts
export * from "./types.js";
export * from "./constants.js";
export * from "./run-states.js";
export * from "./crypto.js";
export * from "./sanitize.js";
export * from "./cron-utils.js";
```

Create stub files so the export doesn't break (implemented in Tasks 4-6):

```typescript
// packages/shared/src/crypto.ts
export {};

// packages/shared/src/sanitize.ts
export {};

// packages/shared/src/cron-utils.ts
export {};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test:unit -- tests/api/unit/run-states.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/ tests/api/unit/run-states.test.ts
git commit -m "feat: add shared types, constants, and run state machine"
```

---

### Task 4: Crypto Utilities (AES-256-GCM)

**Files:**
- Modify: `packages/shared/src/crypto.ts`
- Test: `tests/api/unit/crypto.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/api/unit/crypto.test.ts
import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@agentcron/shared";

const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("crypto", () => {
  it("encrypts and decrypts a string", () => {
    const plaintext = "sk-secret-api-key-12345";
    const encrypted = encrypt(plaintext, TEST_KEY);
    expect(encrypted).not.toEqual(plaintext);
    expect(encrypted).toMatch(/^enc:v1:/);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toEqual(plaintext);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const plaintext = "same-input";
    const a = encrypt(plaintext, TEST_KEY);
    const b = encrypt(plaintext, TEST_KEY);
    expect(a).not.toEqual(b);
  });

  it("returns plaintext unchanged if not encrypted (no enc: prefix)", () => {
    const plaintext = "not-encrypted-value";
    const result = decrypt(plaintext, TEST_KEY);
    expect(result).toEqual(plaintext);
  });

  it("handles empty string", () => {
    const encrypted = encrypt("", TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toEqual("");
  });

  it("handles unicode content", () => {
    const plaintext = "你好世界 🌍";
    const encrypted = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toEqual(plaintext);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("secret", TEST_KEY);
    const parts = encrypted.split(":");
    parts[3] = "00" + parts[3].slice(2); // tamper ciphertext
    const tampered = parts.join(":");
    expect(() => decrypt(tampered, TEST_KEY)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test:unit -- tests/api/unit/crypto.test.ts`
Expected: FAIL — `encrypt` is not exported

- [ ] **Step 3: Implement crypto.ts**

```typescript
// packages/shared/src/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const PREFIX = "enc:v1:";

export function encrypt(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

export function decrypt(ciphertext: string, hexKey: string): string {
  if (!ciphertext.startsWith(PREFIX)) {
    return ciphertext;
  }
  const payload = ciphertext.slice(PREFIX.length);
  const [ivHex, dataHex, tagHex] = payload.split(":");
  const key = Buffer.from(hexKey, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test:unit -- tests/api/unit/crypto.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/crypto.ts tests/api/unit/crypto.test.ts
git commit -m "feat: add AES-256-GCM encrypt/decrypt utilities"
```

---

### Task 5: Log Sanitization

**Files:**
- Modify: `packages/shared/src/sanitize.ts`
- Test: `tests/api/unit/sanitize.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/api/unit/sanitize.test.ts
import { describe, it, expect } from "vitest";
import { sanitize } from "@agentcron/shared";

describe("sanitize", () => {
  it("redacts OpenAI API keys", () => {
    expect(sanitize("key is sk-abc123def456")).toBe("key is [REDACTED]");
  });

  it("redacts GitHub tokens", () => {
    expect(sanitize("token: ghp_1234567890abcdef1234567890abcdef12345678")).toBe(
      "token: [REDACTED]"
    );
  });

  it("redacts Bearer tokens", () => {
    expect(sanitize("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig")).toBe(
      "Authorization: Bearer [REDACTED]"
    );
  });

  it("redacts generic key-xxx patterns", () => {
    expect(sanitize("using key-abc123def456ghi789")).toBe("using [REDACTED]");
  });

  it("redacts Anthropic API keys", () => {
    expect(sanitize("sk-ant-api03-abcdefghijklmnop")).toBe("[REDACTED]");
  });

  it("handles multiple secrets in one string", () => {
    const input = "key1=sk-abc123 key2=ghp_xyz789abcdef012345678901234567890123";
    const result = sanitize(input);
    expect(result).not.toContain("sk-abc123");
    expect(result).not.toContain("ghp_xyz789");
  });

  it("leaves normal text unchanged", () => {
    const input = "this is normal log output with no secrets";
    expect(sanitize(input)).toBe(input);
  });

  it("handles empty string", () => {
    expect(sanitize("")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test:unit -- tests/api/unit/sanitize.test.ts`
Expected: FAIL — `sanitize` is not exported

- [ ] **Step 3: Implement sanitize.ts**

```typescript
// packages/shared/src/sanitize.ts
const PATTERNS: RegExp[] = [
  /sk-ant-[a-zA-Z0-9\-_]{10,}/g,
  /sk-[a-zA-Z0-9]{10,}/g,
  /ghp_[a-zA-Z0-9]{36,}/g,
  /gho_[a-zA-Z0-9]{36,}/g,
  /github_pat_[a-zA-Z0-9_]{22,}/g,
  /key-[a-zA-Z0-9]{10,}/g,
  /Bearer\s+\S+/g,
];

export function sanitize(input: string): string {
  let result = input;
  for (const pattern of PATTERNS) {
    result = result.replace(pattern, (match) =>
      match.startsWith("Bearer ") ? "Bearer [REDACTED]" : "[REDACTED]"
    );
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test:unit -- tests/api/unit/sanitize.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/sanitize.ts tests/api/unit/sanitize.test.ts
git commit -m "feat: add log sanitization for API keys and tokens"
```

---

### Task 6: Cron Utilities

**Files:**
- Modify: `packages/shared/src/cron-utils.ts`
- Test: `tests/api/unit/cron-utils.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/api/unit/cron-utils.test.ts
import { describe, it, expect } from "vitest";
import { getNextRunAt, isValidCron } from "@agentcron/shared";

describe("cron-utils", () => {
  it("validates correct cron expressions", () => {
    expect(isValidCron("*/5 * * * *")).toBe(true);
    expect(isValidCron("0 9 * * 1-5")).toBe(true);
    expect(isValidCron("30 2 * * *")).toBe(true);
  });

  it("rejects invalid cron expressions", () => {
    expect(isValidCron("not a cron")).toBe(false);
    expect(isValidCron("")).toBe(false);
    expect(isValidCron("60 * * * *")).toBe(false);
  });

  it("calculates next run time after a given date", () => {
    const base = new Date("2026-06-19T10:00:00Z");
    const next = getNextRunAt("0 11 * * *", base);
    expect(next).not.toBeNull();
    expect(next!.getUTCHours()).toBe(11);
    expect(next!.getUTCMinutes()).toBe(0);
  });

  it("wraps to next day if today's slot passed", () => {
    const base = new Date("2026-06-19T12:00:00Z");
    const next = getNextRunAt("0 11 * * *", base);
    expect(next!.getUTCDate()).toBe(20);
  });

  it("returns null for invalid cron", () => {
    const next = getNextRunAt("invalid", new Date());
    expect(next).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test:unit -- tests/api/unit/cron-utils.test.ts`
Expected: FAIL — `getNextRunAt` is not exported

- [ ] **Step 3: Implement cron-utils.ts**

```typescript
// packages/shared/src/cron-utils.ts
import cronParser from "cron-parser";

export function isValidCron(expression: string): boolean {
  try {
    cronParser.parseExpression(expression);
    return true;
  } catch {
    return false;
  }
}

export function getNextRunAt(
  expression: string,
  after: Date = new Date()
): Date | null {
  try {
    const interval = cronParser.parseExpression(expression, {
      currentDate: after,
      utc: true,
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test:unit -- tests/api/unit/cron-utils.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/cron-utils.ts tests/api/unit/cron-utils.test.ts
git commit -m "feat: add cron expression validation and next-run calculation"
```

---

### Task 7: Fastify App Skeleton & Plugins

**Files:**
- Create: `apps/api/src/config.ts`
- Create: `apps/api/src/logger.ts`
- Create: `apps/api/src/plugins/prisma.ts`
- Create: `apps/api/src/plugins/trace-id.ts`
- Create: `apps/api/src/plugins/error-handler.ts`
- Create: `apps/api/src/plugins/auth.ts`
- Create: `apps/api/src/index.ts`

- [ ] **Step 1: Implement config.ts**

```typescript
// apps/api/src/config.ts
import { DEFAULTS } from "@agentcron/shared";

export interface AppConfig {
  port: number;
  databaseUrl: string;
  masterKey: string;
  jwtSecret: string;
  dataDir: string;
  maxConcurrentRuns: number;
  schedulerIntervalMs: number;
  dispatcherIntervalMs: number;
  dispatcherBatchSize: number;
}

export function loadConfig(): AppConfig {
  const required = (name: string): string => {
    const val = process.env[name];
    if (!val) throw new Error(`Missing required env var: ${name}`);
    return val;
  };

  return {
    port: parseInt(process.env.PORT || "3000", 10),
    databaseUrl: required("DATABASE_URL"),
    masterKey: required("MASTER_KEY"),
    jwtSecret: required("JWT_SECRET"),
    dataDir: process.env.DATA_DIR || "./data",
    maxConcurrentRuns: parseInt(
      process.env.MAX_CONCURRENT_RUNS || String(DEFAULTS.MAX_CONCURRENT_RUNS),
      10
    ),
    schedulerIntervalMs: parseInt(
      process.env.SCHEDULER_INTERVAL_MS || String(DEFAULTS.SCHEDULER_INTERVAL_MS),
      10
    ),
    dispatcherIntervalMs: parseInt(
      process.env.DISPATCHER_INTERVAL_MS || String(DEFAULTS.DISPATCHER_INTERVAL_MS),
      10
    ),
    dispatcherBatchSize: DEFAULTS.DISPATCHER_BATCH_SIZE,
  };
}
```

- [ ] **Step 2: Implement logger.ts**

```typescript
// apps/api/src/logger.ts
export function log(
  level: "info" | "warn" | "error" | "debug",
  module: string,
  msg: string,
  extra: Record<string, unknown> = {},
  traceId?: string
): void {
  const ts = new Date().toISOString();
  const kvPairs = Object.entries(extra)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(" ");
  const traceStr = traceId ? ` traceId=${traceId}` : "";
  console.log(
    `ts=${ts} level=${level} module=${module}${traceStr} msg=${JSON.stringify(msg)} ${kvPairs}`.trim()
  );
}
```

- [ ] **Step 3: Implement Prisma plugin**

```typescript
// apps/api/src/plugins/prisma.ts
import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const prisma = new PrismaClient();
  await prisma.$connect();

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
```

Add `fastify-plugin` to api dependencies:

```json
// add to apps/api/package.json dependencies
"fastify-plugin": "^5.0.0"
```

- [ ] **Step 4: Implement trace-id plugin**

```typescript
// apps/api/src/plugins/trace-id.ts
import fp from "fastify-plugin";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    traceId: string;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest("traceId", "");

  fastify.addHook("onRequest", async (request) => {
    request.traceId =
      (request.headers["x-trace-id"] as string) || randomUUID();
  });

  fastify.addHook("onSend", async (request, reply) => {
    reply.header("x-trace-id", request.traceId);
  });
});
```

- [ ] **Step 5: Implement error-handler plugin**

```typescript
// apps/api/src/plugins/error-handler.ts
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { log } from "../logger.js";

export default fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error, request, reply) => {
    const traceId = request.traceId || "unknown";
    const statusCode = error.statusCode || 500;
    const code = statusCode >= 500 ? 50000 : statusCode * 100;

    if (statusCode >= 500) {
      log("error", "http", error.message, { stack: error.stack }, traceId);
    }

    reply.status(statusCode).send({
      code,
      data: null,
      message: statusCode >= 500 ? "Internal Server Error" : error.message,
      traceId,
    });
  });
});
```

- [ ] **Step 6: Implement auth plugin**

```typescript
// apps/api/src/plugins/auth.ts
import fp from "fastify-plugin";
import fjwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { JwtPayload } from "@agentcron/shared";

declare module "fastify" {
  interface FastifyRequest {
    currentUser: JwtPayload;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(fjwt, {
    secret: fastify.config.jwtSecret,
  });

  fastify.decorateRequest("currentUser", null);

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest) => {
      await request.jwtVerify();
      request.currentUser = request.user;
    }
  );

  fastify.decorate(
    "requireAdmin",
    async (request: FastifyRequest) => {
      await request.jwtVerify();
      request.currentUser = request.user;
      if (request.currentUser.role !== "admin") {
        throw fastify.httpErrors.forbidden("Admin access required");
      }
    }
  );
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    requireAdmin: (request: FastifyRequest) => Promise<void>;
    config: import("../config.js").AppConfig;
  }
}
```

- [ ] **Step 7: Implement app entry point**

```typescript
// apps/api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { loadConfig } from "./config.js";
import prismaPlugin from "./plugins/prisma.js";
import traceIdPlugin from "./plugins/trace-id.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import authPlugin from "./plugins/auth.js";
import { log } from "./logger.js";

export async function buildApp() {
  const config = loadConfig();
  const app = Fastify({ logger: false });

  app.decorate("config", config);

  await app.register(cors, { origin: true });
  await app.register(traceIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  // Routes registered in subsequent tasks
  // await app.register(authRoutes, { prefix: "/api/auth" });
  // await app.register(taskRoutes, { prefix: "/api/tasks" });
  // await app.register(runRoutes, { prefix: "/api/runs" });
  // await app.register(adminRoutes, { prefix: "/api/admin" });

  return app;
}

async function main() {
  const app = await buildApp();
  const address = await app.listen({ port: app.config.port, host: "0.0.0.0" });
  log("info", "server", "started", { address });

  const shutdown = async () => {
    log("info", "server", "shutting down");
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  log("error", "server", "failed to start", { error: String(err) });
  process.exit(1);
});
```

- [ ] **Step 8: Verify app starts (requires DB running)**

Run: `cp .env.example .env && pnpm --filter @agentcron/api dev`
Expected: Server starts on port 3000, logs `ts=... level=info module=server msg="started"`. Ctrl+C to stop.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/ apps/api/package.json
git commit -m "feat: add Fastify skeleton with prisma, auth, trace-id, error-handler plugins"
```

---

### Task 8: Auth Module (Login / Logout / Me)

**Files:**
- Create: `apps/api/src/modules/auth/auth.schema.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.routes.ts`
- Modify: `apps/api/src/index.ts` (register routes)
- Test: `tests/api/integration/auth.test.ts`

- [ ] **Step 1: Create test helper**

```typescript
// tests/api/helpers/setup.ts
import { buildApp } from "../../apps/api/src/index.js";
import type { FastifyInstance } from "fastify";

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

export function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}
```

- [ ] **Step 2: Write failing integration test**

```typescript
// tests/api/integration/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, authHeader } from "../helpers/setup.js";

describe("auth routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/auth/login returns JWT for valid credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "admin123" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.username).toBe("admin");
    expect(body.data.user.role).toBe("admin");
  });

  it("POST /api/auth/login rejects wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/auth/me returns current user info", async () => {
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "admin123" },
    });
    const token = loginRes.json().data.token;

    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.username).toBe("admin");
  });

  it("GET /api/auth/me rejects without token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
    });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/auth.test.ts`
Expected: FAIL — routes not registered

- [ ] **Step 4: Implement auth schema**

```typescript
// apps/api/src/modules/auth/auth.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(255),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 5: Implement auth service**

```typescript
// apps/api/src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import type { PrismaClient } from "@prisma/client";
import type { JwtPayload } from "@agentcron/shared";

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async validateCredentials(
    username: string,
    password: string
  ): Promise<JwtPayload | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return {
      userId: user.id,
      username: user.username,
      role: user.role as JwtPayload["role"],
    };
  }

  async getUserById(userId: bigint) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, createdAt: true },
    });
  }
}
```

- [ ] **Step 6: Implement auth routes**

```typescript
// apps/api/src/modules/auth/auth.routes.ts
import type { FastifyInstance } from "fastify";
import { loginSchema } from "./auth.schema.js";
import { AuthService } from "./auth.service.js";
import { DEFAULTS } from "@agentcron/shared";

export default async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app.prisma);

  app.post("/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const payload = await authService.validateCredentials(
      input.username,
      input.password
    );
    if (!payload) {
      return reply.status(401).send({
        code: 40100,
        data: null,
        message: "Invalid credentials",
        traceId: request.traceId,
      });
    }

    const token = app.jwt.sign(
      {
        userId: payload.userId.toString(),
        username: payload.username,
        role: payload.role,
      },
      { expiresIn: DEFAULTS.JWT_EXPIRES_IN }
    );

    return {
      code: 0,
      data: {
        token,
        user: {
          id: payload.userId.toString(),
          username: payload.username,
          role: payload.role,
        },
      },
      message: "ok",
      traceId: request.traceId,
    };
  });

  app.post("/logout", { preHandler: [app.authenticate] }, async (request) => {
    return {
      code: 0,
      data: null,
      message: "ok",
      traceId: request.traceId,
    };
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    const user = await authService.getUserById(
      BigInt(request.currentUser.userId as unknown as string)
    );
    if (!user) {
      return { code: 40400, data: null, message: "User not found", traceId: request.traceId };
    }
    return {
      code: 0,
      data: {
        id: user.id.toString(),
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      message: "ok",
      traceId: request.traceId,
    };
  });
}
```

- [ ] **Step 7: Register auth routes in index.ts**

Update `apps/api/src/index.ts` — uncomment/add auth routes:

```typescript
import authRoutes from "./modules/auth/auth.routes.js";

// Inside buildApp(), after plugin registration:
await app.register(authRoutes, { prefix: "/api/auth" });
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/auth.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/auth/ apps/api/src/index.ts tests/api/
git commit -m "feat: add auth module with login, logout, and me endpoints"
```

---

### Task 9: Run State Machine

**Files:**
- Create: `apps/api/src/modules/run/run-state-machine.ts`
- Test: `tests/api/unit/run-state-machine.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/api/unit/run-state-machine.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RunStateMachine } from "../../../apps/api/src/modules/run/run-state-machine.js";
import { RunStatus } from "@agentcron/shared";

const mockPrisma = {
  run: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  taskRunLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
} as any;

describe("RunStateMachine", () => {
  let sm: RunStateMachine;

  beforeEach(() => {
    vi.clearAllMocks();
    sm = new RunStateMachine(mockPrisma);
  });

  it("transitions PENDING → RUNNING", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      return fn(mockPrisma);
    });
    mockPrisma.run.findUnique.mockResolvedValue({
      id: 1n,
      status: RunStatus.PENDING,
    });
    mockPrisma.run.update.mockResolvedValue({
      id: 1n,
      status: RunStatus.RUNNING,
    });

    const result = await sm.transition(1n, RunStatus.RUNNING, {});
    expect(result.status).toBe(RunStatus.RUNNING);
    expect(mockPrisma.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ status: RunStatus.RUNNING }),
      })
    );
  });

  it("rejects invalid transition PENDING → SUCCESS", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      return fn(mockPrisma);
    });
    mockPrisma.run.findUnique.mockResolvedValue({
      id: 1n,
      status: RunStatus.PENDING,
    });

    await expect(sm.transition(1n, RunStatus.SUCCESS, {})).rejects.toThrow(
      "Invalid transition"
    );
  });

  it("rejects transition from terminal state", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      return fn(mockPrisma);
    });
    mockPrisma.run.findUnique.mockResolvedValue({
      id: 1n,
      status: RunStatus.SUCCESS,
    });

    await expect(sm.transition(1n, RunStatus.RUNNING, {})).rejects.toThrow(
      "Invalid transition"
    );
  });

  it("sets finishedAt and duration for terminal states", async () => {
    const startedAt = new Date("2026-06-19T10:00:00Z");
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      return fn(mockPrisma);
    });
    mockPrisma.run.findUnique.mockResolvedValue({
      id: 1n,
      status: RunStatus.RUNNING,
      startedAt,
    });
    mockPrisma.run.update.mockResolvedValue({
      id: 1n,
      status: RunStatus.SUCCESS,
    });

    await sm.transition(1n, RunStatus.SUCCESS, {});

    expect(mockPrisma.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: RunStatus.SUCCESS,
          finishedAt: expect.any(Date),
          duration: expect.any(Number),
        }),
      })
    );
  });

  it("logs state transition as system event", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      return fn(mockPrisma);
    });
    mockPrisma.run.findUnique.mockResolvedValue({
      id: 1n,
      status: RunStatus.PENDING,
    });
    mockPrisma.run.update.mockResolvedValue({
      id: 1n,
      status: RunStatus.RUNNING,
    });

    await sm.transition(1n, RunStatus.RUNNING, {});

    expect(mockPrisma.taskRunLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          runId: 1n,
          logType: "system",
        }),
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test:unit -- tests/api/unit/run-state-machine.test.ts`
Expected: FAIL — cannot import `RunStateMachine`

- [ ] **Step 3: Implement run-state-machine.ts**

```typescript
// apps/api/src/modules/run/run-state-machine.ts
import type { PrismaClient } from "@prisma/client";
import { canTransition, isTerminal } from "@agentcron/shared";

export interface TransitionContext {
  resultSummary?: string;
  errorMessage?: string;
  riskLevel?: string;
  needsReview?: boolean;
}

export class RunStateMachine {
  constructor(private prisma: PrismaClient) {}

  async transition(
    runId: bigint,
    targetStatus: string,
    context: TransitionContext
  ) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.run.findUnique({ where: { id: runId } });
      if (!run) throw new Error(`Run ${runId} not found`);

      if (!canTransition(run.status, targetStatus)) {
        throw new Error(
          `Invalid transition: ${run.status} → ${targetStatus} for run ${runId}`
        );
      }

      const now = new Date();
      const updateData: Record<string, unknown> = {
        status: targetStatus,
      };

      if (targetStatus === "RUNNING") {
        updateData.startedAt = now;
      }

      if (isTerminal(targetStatus)) {
        updateData.finishedAt = now;
        if (run.startedAt) {
          updateData.duration = Math.floor(
            (now.getTime() - run.startedAt.getTime()) / 1000
          );
        }
      }

      if (context.resultSummary !== undefined) {
        updateData.resultSummary = context.resultSummary;
      }
      if (context.errorMessage !== undefined) {
        updateData.errorMessage = context.errorMessage;
      }
      if (context.riskLevel !== undefined) {
        updateData.riskLevel = context.riskLevel;
      }
      if (context.needsReview !== undefined) {
        updateData.needsReview = context.needsReview;
      }

      const updated = await tx.run.update({
        where: { id: runId },
        data: updateData,
      });

      await tx.taskRunLog.create({
        data: {
          runId,
          logType: "system",
          content: `State transition: ${run.status} → ${targetStatus}`,
          metadata: context as any,
        },
      });

      return updated;
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test:unit -- tests/api/unit/run-state-machine.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/run/run-state-machine.ts tests/api/unit/run-state-machine.test.ts
git commit -m "feat: add RunStateMachine with transition validation and logging"
```

---

### Task 10: Task Module (CRUD + Enable/Disable/Trigger)

**Files:**
- Create: `apps/api/src/modules/task/task.schema.ts`
- Create: `apps/api/src/modules/task/task.service.ts`
- Create: `apps/api/src/modules/task/task.routes.ts`
- Modify: `apps/api/src/index.ts` (register routes)
- Test: `tests/api/integration/task.test.ts`

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/api/integration/task.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, authHeader } from "../helpers/setup.js";

describe("task routes", () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "admin123" },
    });
    token = res.json().data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.prisma.run.deleteMany();
    await app.prisma.task.deleteMany();
  });

  const validTask = {
    name: "daily-review",
    agentType: "codex",
    taskPrompt: "Review all PRs",
    schedule: { cron: "0 9 * * 1-5" },
    sessionPolicy: "always_new",
    environment: {},
    permissionPolicy: {},
    notificationConfig: { enabled: false, channels: [], onStatuses: [] },
  };

  it("POST /api/tasks creates a task", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: authHeader(token),
      payload: validTask,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.name).toBe("daily-review");
    expect(body.data.status).toBe("paused");
  });

  it("GET /api/tasks returns paginated list", async () => {
    await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: authHeader(token),
      payload: validTask,
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/tasks",
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.items).toHaveLength(1);
    expect(res.json().data.total).toBe(1);
  });

  it("PATCH /api/tasks/:id updates a task", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: authHeader(token),
      payload: validTask,
    });
    const taskId = createRes.json().data.id;

    const res = await app.inject({
      method: "PATCH",
      url: `/api/tasks/${taskId}`,
      headers: authHeader(token),
      payload: { name: "updated-name" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe("updated-name");
  });

  it("POST /api/tasks/:id:enable activates a task", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: authHeader(token),
      payload: validTask,
    });
    const taskId = createRes.json().data.id;

    const res = await app.inject({
      method: "POST",
      url: `/api/tasks/${taskId}:enable`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe("active");
    expect(res.json().data.nextRunAt).toBeDefined();
  });

  it("DELETE /api/tasks/:id soft-deletes", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: authHeader(token),
      payload: validTask,
    });
    const taskId = createRes.json().data.id;

    const delRes = await app.inject({
      method: "DELETE",
      url: `/api/tasks/${taskId}`,
      headers: authHeader(token),
    });
    expect(delRes.statusCode).toBe(200);

    const getRes = await app.inject({
      method: "GET",
      url: `/api/tasks/${taskId}`,
      headers: authHeader(token),
    });
    expect(getRes.statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/task.test.ts`
Expected: FAIL — routes not registered

- [ ] **Step 3: Implement task.schema.ts**

```typescript
// apps/api/src/modules/task/task.schema.ts
import { z } from "zod";

export const createTaskSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  agentType: z.string().min(1).max(64),
  project: z.string().max(255).optional(),
  taskPrompt: z.string().min(1),
  schedule: z.object({
    cron: z.string(),
    timezone: z.string().optional(),
  }),
  sessionPolicy: z.enum(["always_new", "reuse_fixed", "reuse_last_success"]),
  concurrencyPolicy: z.enum(["skip_if_running", "queue_if_running", "allow_parallel"]).default("skip_if_running"),
  environment: z.record(z.unknown()).default({}),
  permissionPolicy: z.record(z.unknown()).default({}),
  notificationConfig: z.object({
    enabled: z.boolean(),
    channels: z.array(z.object({
      type: z.enum(["webhook", "feishu"]),
      url: z.string().url(),
      secret: z.string().optional(),
    })),
    onStatuses: z.array(z.string()),
  }),
  timeoutSeconds: z.number().int().min(60).max(86400).default(3600),
  maxRetries: z.number().int().min(0).max(10).default(0),
});

export const updateTaskSchema = createTaskSchema.partial();

export const listTasksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["active", "paused"]).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

- [ ] **Step 4: Implement task.service.ts**

```typescript
// apps/api/src/modules/task/task.service.ts
import type { PrismaClient, Task } from "@prisma/client";
import type { JwtPayload } from "@agentcron/shared";
import { encrypt, decrypt, getNextRunAt, isValidCron } from "@agentcron/shared";
import type { CreateTaskInput, UpdateTaskInput } from "./task.schema.js";

export class TaskService {
  constructor(
    private prisma: PrismaClient,
    private masterKey: string
  ) {}

  async create(input: CreateTaskInput, user: JwtPayload): Promise<Task> {
    if (!isValidCron(input.schedule.cron)) {
      throw Object.assign(new Error("Invalid cron expression"), { statusCode: 400 });
    }

    return this.prisma.task.create({
      data: {
        name: input.name,
        description: input.description,
        agentType: input.agentType,
        project: input.project,
        taskPrompt: encrypt(input.taskPrompt, this.masterKey),
        schedule: input.schedule as any,
        sessionPolicy: input.sessionPolicy,
        concurrencyPolicy: input.concurrencyPolicy,
        environment: encrypt(JSON.stringify(input.environment), this.masterKey) as any,
        permissionPolicy: input.permissionPolicy as any,
        notificationConfig: input.notificationConfig as any,
        timeoutSeconds: input.timeoutSeconds,
        maxRetries: input.maxRetries,
        status: "paused",
        ownerId: BigInt(user.userId as unknown as string),
        createdById: BigInt(user.userId as unknown as string),
      },
    });
  }

  async list(page: number, pageSize: number, status?: string, userId?: bigint) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;
    if (userId) where.ownerId = userId;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items: items.map((t) => this.serialize(t)), total, page, pageSize };
  }

  async getById(id: bigint): Promise<Task | null> {
    return this.prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async update(id: bigint, input: UpdateTaskInput, userId?: bigint) {
    const task = await this.guardOwner(id, userId);
    const data: Record<string, unknown> = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.taskPrompt !== undefined) data.taskPrompt = encrypt(input.taskPrompt, this.masterKey);
    if (input.schedule !== undefined) {
      if (!isValidCron(input.schedule.cron)) {
        throw Object.assign(new Error("Invalid cron expression"), { statusCode: 400 });
      }
      data.schedule = input.schedule as any;
      if (task.status === "active") {
        data.nextRunAt = getNextRunAt(input.schedule.cron);
      }
    }
    if (input.sessionPolicy !== undefined) data.sessionPolicy = input.sessionPolicy;
    if (input.concurrencyPolicy !== undefined) data.concurrencyPolicy = input.concurrencyPolicy;
    if (input.environment !== undefined) data.environment = encrypt(JSON.stringify(input.environment), this.masterKey) as any;
    if (input.permissionPolicy !== undefined) data.permissionPolicy = input.permissionPolicy as any;
    if (input.notificationConfig !== undefined) data.notificationConfig = input.notificationConfig as any;
    if (input.timeoutSeconds !== undefined) data.timeoutSeconds = input.timeoutSeconds;
    if (input.maxRetries !== undefined) data.maxRetries = input.maxRetries;

    return this.prisma.task.update({ where: { id }, data });
  }

  async softDelete(id: bigint, userId?: bigint) {
    await this.guardOwner(id, userId);
    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date(), status: "deleted" },
    });
  }

  async enable(id: bigint, userId?: bigint) {
    const task = await this.guardOwner(id, userId);
    const schedule = task.schedule as { cron: string };
    const nextRunAt = getNextRunAt(schedule.cron);

    return this.prisma.task.update({
      where: { id },
      data: { status: "active", nextRunAt },
    });
  }

  async disable(id: bigint, userId?: bigint) {
    await this.guardOwner(id, userId);
    return this.prisma.task.update({
      where: { id },
      data: { status: "paused", nextRunAt: null },
    });
  }

  serialize(task: Task) {
    return {
      ...task,
      id: task.id.toString(),
      ownerId: task.ownerId.toString(),
      createdById: task.createdById.toString(),
      taskPrompt: decrypt(task.taskPrompt, this.masterKey),
    };
  }

  private async guardOwner(id: bigint, userId?: bigint): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
    if (!task) {
      throw Object.assign(new Error("Task not found"), { statusCode: 404 });
    }
    if (userId && task.ownerId !== userId) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    }
    return task;
  }
}
```

- [ ] **Step 5: Implement task.routes.ts**

```typescript
// apps/api/src/modules/task/task.routes.ts
import type { FastifyInstance } from "fastify";
import { createTaskSchema, updateTaskSchema, listTasksSchema } from "./task.schema.js";
import { TaskService } from "./task.service.js";

export default async function taskRoutes(app: FastifyInstance) {
  const taskService = new TaskService(app.prisma, app.config.masterKey);

  app.addHook("onRequest", app.authenticate);

  app.post("/", async (request) => {
    const input = createTaskSchema.parse(request.body);
    const task = await taskService.create(input, request.currentUser);
    return {
      code: 0,
      data: taskService.serialize(task),
      message: "ok",
      traceId: request.traceId,
    };
  });

  app.get("/", async (request) => {
    const query = listTasksSchema.parse(request.query);
    const userId =
      request.currentUser.role === "admin"
        ? undefined
        : BigInt(request.currentUser.userId as unknown as string);
    const data = await taskService.list(query.page, query.pageSize, query.status, userId);
    return { code: 0, data, message: "ok", traceId: request.traceId };
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await taskService.getById(BigInt(id));
    if (!task) {
      return reply.status(404).send({
        code: 40400,
        data: null,
        message: "Task not found",
        traceId: request.traceId,
      });
    }
    return { code: 0, data: taskService.serialize(task), message: "ok", traceId: request.traceId };
  });

  app.patch("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const input = updateTaskSchema.parse(request.body);
    const userId =
      request.currentUser.role === "admin"
        ? undefined
        : BigInt(request.currentUser.userId as unknown as string);
    const task = await taskService.update(BigInt(id), input, userId);
    return { code: 0, data: taskService.serialize(task), message: "ok", traceId: request.traceId };
  });

  app.delete("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const userId =
      request.currentUser.role === "admin"
        ? undefined
        : BigInt(request.currentUser.userId as unknown as string);
    await taskService.softDelete(BigInt(id), userId);
    return { code: 0, data: null, message: "ok", traceId: request.traceId };
  });

  app.post("/:id\\:enable", async (request) => {
    const { id } = request.params as { id: string };
    const userId =
      request.currentUser.role === "admin"
        ? undefined
        : BigInt(request.currentUser.userId as unknown as string);
    const task = await taskService.enable(BigInt(id), userId);
    return { code: 0, data: taskService.serialize(task), message: "ok", traceId: request.traceId };
  });

  app.post("/:id\\:disable", async (request) => {
    const { id } = request.params as { id: string };
    const userId =
      request.currentUser.role === "admin"
        ? undefined
        : BigInt(request.currentUser.userId as unknown as string);
    const task = await taskService.disable(BigInt(id), userId);
    return { code: 0, data: taskService.serialize(task), message: "ok", traceId: request.traceId };
  });

  app.post("/:id\\:trigger", async (request) => {
    const { id } = request.params as { id: string };
    const task = await taskService.getById(BigInt(id));
    if (!task) {
      throw Object.assign(new Error("Task not found"), { statusCode: 404 });
    }
    const run = await app.prisma.run.create({
      data: {
        taskId: task.id,
        trigger: "manual",
        triggeredById: BigInt(request.currentUser.userId as unknown as string),
        status: "PENDING",
        scheduledFor: new Date(),
        attemptNo: 1,
      },
    });
    return {
      code: 0,
      data: { ...run, id: run.id.toString(), taskId: run.taskId.toString() },
      message: "ok",
      traceId: request.traceId,
    };
  });
}
```

- [ ] **Step 6: Register task routes in index.ts**

Add to `apps/api/src/index.ts`:

```typescript
import taskRoutes from "./modules/task/task.routes.js";

// Inside buildApp():
await app.register(taskRoutes, { prefix: "/api/tasks" });
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/task.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/task/ apps/api/src/index.ts tests/api/integration/task.test.ts
git commit -m "feat: add task CRUD, enable/disable/trigger endpoints"
```

---

### Task 11: Run Module (List, Detail, Cancel, Rerun, Logs, SSE)

**Files:**
- Create: `apps/api/src/modules/run/run.schema.ts`
- Create: `apps/api/src/modules/run/run.service.ts`
- Create: `apps/api/src/modules/run/run.routes.ts`
- Modify: `apps/api/src/index.ts`
- Test: `tests/api/integration/run.test.ts`

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/api/integration/run.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, authHeader } from "../helpers/setup.js";

describe("run routes", () => {
  let app: FastifyInstance;
  let token: string;
  let taskId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "admin123" },
    });
    token = loginRes.json().data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.prisma.taskRunLog.deleteMany();
    await app.prisma.taskRunArtifact.deleteMany();
    await app.prisma.run.deleteMany();
    await app.prisma.task.deleteMany();

    const taskRes = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: authHeader(token),
      payload: {
        name: "test-task",
        agentType: "codex",
        taskPrompt: "do something",
        schedule: { cron: "0 * * * *" },
        sessionPolicy: "always_new",
        environment: {},
        permissionPolicy: {},
        notificationConfig: { enabled: false, channels: [], onStatuses: [] },
      },
    });
    taskId = taskRes.json().data.id;
  });

  it("GET /api/tasks/:id/runs returns runs for a task", async () => {
    await app.inject({
      method: "POST",
      url: `/api/tasks/${taskId}:trigger`,
      headers: authHeader(token),
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/tasks/${taskId}/runs`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.items).toHaveLength(1);
  });

  it("GET /api/runs/:id returns run detail", async () => {
    const triggerRes = await app.inject({
      method: "POST",
      url: `/api/tasks/${taskId}:trigger`,
      headers: authHeader(token),
    });
    const runId = triggerRes.json().data.id;

    const res = await app.inject({
      method: "GET",
      url: `/api/runs/${runId}`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe("PENDING");
  });

  it("POST /api/runs/:id:cancel cancels a PENDING run", async () => {
    const triggerRes = await app.inject({
      method: "POST",
      url: `/api/tasks/${taskId}:trigger`,
      headers: authHeader(token),
    });
    const runId = triggerRes.json().data.id;

    const res = await app.inject({
      method: "POST",
      url: `/api/runs/${runId}:cancel`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe("CANCELLED");
  });

  it("GET /api/runs/:id/logs returns logs for a run", async () => {
    const triggerRes = await app.inject({
      method: "POST",
      url: `/api/tasks/${taskId}:trigger`,
      headers: authHeader(token),
    });
    const runId = triggerRes.json().data.id;

    const res = await app.inject({
      method: "GET",
      url: `/api/runs/${runId}/logs`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.items).toBeInstanceOf(Array);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/run.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement run.schema.ts**

```typescript
// apps/api/src/modules/run/run.schema.ts
import { z } from "zod";

export const listRunsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

export const listLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
```

- [ ] **Step 4: Implement run.service.ts**

```typescript
// apps/api/src/modules/run/run.service.ts
import type { PrismaClient } from "@prisma/client";
import { RunStateMachine } from "./run-state-machine.js";
import { RunStatus } from "@agentcron/shared";

export class RunService {
  private stateMachine: RunStateMachine;

  constructor(private prisma: PrismaClient) {
    this.stateMachine = new RunStateMachine(prisma);
  }

  async listByTask(taskId: bigint, page: number, pageSize: number, status?: string) {
    const where: Record<string, unknown> = { taskId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.run.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.run.count({ where }),
    ]);

    return {
      items: items.map((r) => this.serialize(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(id: bigint) {
    const run = await this.prisma.run.findUnique({
      where: { id },
      include: { task: { select: { name: true, agentType: true } } },
    });
    return run ? this.serialize(run) : null;
  }

  async cancel(id: bigint) {
    return this.stateMachine.transition(id, RunStatus.CANCELLED, {});
  }

  async rerun(id: bigint, userId: bigint) {
    const original = await this.prisma.run.findUnique({ where: { id } });
    if (!original) throw Object.assign(new Error("Run not found"), { statusCode: 404 });

    const run = await this.prisma.run.create({
      data: {
        taskId: original.taskId,
        trigger: "manual",
        triggeredById: userId,
        status: RunStatus.PENDING,
        scheduledFor: new Date(),
        attemptNo: 1,
      },
    });

    return this.serialize(run);
  }

  async getLogs(runId: bigint, page: number, pageSize: number) {
    const where = { runId };
    const [items, total] = await Promise.all([
      this.prisma.taskRunLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.taskRunLog.count({ where }),
    ]);

    return {
      items: items.map((l) => ({
        ...l,
        id: l.id.toString(),
        runId: l.runId.toString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  private serialize(run: any) {
    return {
      ...run,
      id: run.id.toString(),
      taskId: run.taskId.toString(),
      triggeredById: run.triggeredById?.toString() ?? null,
    };
  }
}
```

- [ ] **Step 5: Implement run.routes.ts (including SSE)**

```typescript
// apps/api/src/modules/run/run.routes.ts
import type { FastifyInstance } from "fastify";
import { listRunsSchema, listLogsSchema } from "./run.schema.js";
import { RunService } from "./run.service.js";

export async function taskRunRoutes(app: FastifyInstance) {
  const runService = new RunService(app.prisma);

  app.addHook("onRequest", app.authenticate);

  app.get("/", async (request) => {
    const { id } = request.params as { id: string };
    const query = listRunsSchema.parse(request.query);
    const data = await runService.listByTask(BigInt(id), query.page, query.pageSize, query.status);
    return { code: 0, data, message: "ok", traceId: request.traceId };
  });
}

export default async function runRoutes(app: FastifyInstance) {
  const runService = new RunService(app.prisma);

  app.addHook("onRequest", app.authenticate);

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await runService.getById(BigInt(id));
    if (!data) {
      return reply.status(404).send({
        code: 40400, data: null, message: "Run not found", traceId: request.traceId,
      });
    }
    return { code: 0, data, message: "ok", traceId: request.traceId };
  });

  app.get("/:id/logs", async (request) => {
    const { id } = request.params as { id: string };
    const query = listLogsSchema.parse(request.query);
    const data = await runService.getLogs(BigInt(id), query.page, query.pageSize);
    return { code: 0, data, message: "ok", traceId: request.traceId };
  });

  app.get("/:id/logs/stream", async (request, reply) => {
    const { id } = request.params as { id: string };
    const runId = BigInt(id);

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Trace-Id": request.traceId,
    });

    let lastLogId = 0n;
    const interval = setInterval(async () => {
      try {
        const run = await app.prisma.run.findUnique({
          where: { id: runId },
          select: { status: true },
        });
        const logs = await app.prisma.taskRunLog.findMany({
          where: { runId, id: { gt: lastLogId } },
          orderBy: { id: "asc" },
          take: 50,
        });

        for (const log of logs) {
          const data = JSON.stringify({
            id: log.id.toString(),
            logType: log.logType,
            content: log.content,
            metadata: log.metadata,
            createdAt: log.createdAt,
          });
          reply.raw.write(`data: ${data}\n\n`);
          lastLogId = log.id;
        }

        if (run && ["SUCCESS", "FAILED", "TIMEOUT", "CANCELLED", "SYSTEM_ERROR", "NEEDS_REVIEW", "PARTIAL_SUCCESS", "NO_ACTION", "SKIPPED"].includes(run.status)) {
          reply.raw.write(`event: done\ndata: ${JSON.stringify({ status: run.status })}\n\n`);
          clearInterval(interval);
          reply.raw.end();
        }
      } catch {
        clearInterval(interval);
        reply.raw.end();
      }
    }, 1000);

    request.raw.on("close", () => {
      clearInterval(interval);
    });
  });

  app.post("/:id\\:cancel", async (request) => {
    const { id } = request.params as { id: string };
    const run = await runService.cancel(BigInt(id));
    return {
      code: 0,
      data: { ...run, id: run.id.toString(), taskId: run.taskId.toString() },
      message: "ok",
      traceId: request.traceId,
    };
  });

  app.post("/:id\\:rerun", async (request) => {
    const { id } = request.params as { id: string };
    const userId = BigInt(request.currentUser.userId as unknown as string);
    const data = await runService.rerun(BigInt(id), userId);
    return { code: 0, data, message: "ok", traceId: request.traceId };
  });

  app.get("/:id/artifacts/:aid", async (request, reply) => {
    const { id, aid } = request.params as { id: string; aid: string };
    const artifact = await app.prisma.taskRunArtifact.findFirst({
      where: { id: BigInt(aid), runId: BigInt(id) },
    });
    if (!artifact || !artifact.storagePath) {
      return reply.status(404).send({
        code: 40400, data: null, message: "Artifact not found", traceId: request.traceId,
      });
    }
    const { createReadStream } = await import("node:fs");
    const stream = createReadStream(artifact.storagePath);
    reply.header("Content-Disposition", `attachment; filename="${artifact.name}"`);
    return reply.send(stream);
  });
}
```

- [ ] **Step 6: Register run routes in index.ts**

Add to `apps/api/src/index.ts`:

```typescript
import runRoutes, { taskRunRoutes } from "./modules/run/run.routes.js";

// Inside buildApp():
await app.register(taskRunRoutes, { prefix: "/api/tasks/:id/runs" });
await app.register(runRoutes, { prefix: "/api/runs" });
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/run.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/run/ tests/api/integration/run.test.ts apps/api/src/index.ts
git commit -m "feat: add run routes with list, detail, cancel, rerun, logs, SSE stream"
```

---

### Task 12: Scheduler Service

**Files:**
- Create: `apps/api/src/modules/scheduler/scheduler.service.ts`
- Modify: `apps/api/src/index.ts`
- Test: `tests/api/integration/scheduler.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/api/integration/scheduler.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/setup.js";

describe("SchedulerService", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.prisma.taskRunLog.deleteMany();
    await app.prisma.run.deleteMany();
    await app.prisma.task.deleteMany();
  });

  it("creates a PENDING run for a due active task", async () => {
    await app.prisma.task.create({
      data: {
        name: "due-task",
        agentType: "codex",
        taskPrompt: "test",
        schedule: { cron: "* * * * *" },
        sessionPolicy: "always_new",
        environment: {},
        permissionPolicy: {},
        notificationConfig: { enabled: false, channels: [], onStatuses: [] },
        status: "active",
        ownerId: 1n,
        createdById: 1n,
        nextRunAt: new Date(Date.now() - 60000),
      },
    });

    const { SchedulerService } = await import(
      "../../apps/api/src/modules/scheduler/scheduler.service.js"
    );
    const scheduler = new SchedulerService(app.prisma);
    await scheduler.tick();

    const runs = await app.prisma.run.findMany();
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("PENDING");
    expect(runs[0].trigger).toBe("cron");

    const task = await app.prisma.task.findFirst();
    expect(task!.nextRunAt).not.toBeNull();
    expect(task!.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("skips task with skip_if_running when a run is already RUNNING", async () => {
    const task = await app.prisma.task.create({
      data: {
        name: "busy-task",
        agentType: "codex",
        taskPrompt: "test",
        schedule: { cron: "* * * * *" },
        sessionPolicy: "always_new",
        concurrencyPolicy: "skip_if_running",
        environment: {},
        permissionPolicy: {},
        notificationConfig: { enabled: false, channels: [], onStatuses: [] },
        status: "active",
        ownerId: 1n,
        createdById: 1n,
        nextRunAt: new Date(Date.now() - 60000),
      },
    });

    await app.prisma.run.create({
      data: {
        taskId: task.id,
        trigger: "cron",
        status: "RUNNING",
        scheduledFor: new Date(),
        attemptNo: 1,
        startedAt: new Date(),
        claimedBy: "worker-1",
        claimedAt: new Date(),
        heartbeatAt: new Date(),
      },
    });

    const { SchedulerService } = await import(
      "../../apps/api/src/modules/scheduler/scheduler.service.js"
    );
    const scheduler = new SchedulerService(app.prisma);
    await scheduler.tick();

    const runs = await app.prisma.run.findMany({ where: { status: "PENDING" } });
    expect(runs).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/scheduler.test.ts`
Expected: FAIL — cannot import `SchedulerService`

- [ ] **Step 3: Implement scheduler.service.ts**

```typescript
// apps/api/src/modules/scheduler/scheduler.service.ts
import type { PrismaClient } from "@prisma/client";
import { getNextRunAt } from "@agentcron/shared";
import { log } from "../../logger.js";

export class SchedulerService {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaClient) {}

  start(intervalMs: number) {
    this.timer = setInterval(() => this.tick().catch((e) => {
      log("error", "scheduler", "tick failed", { error: String(e) });
    }), intervalMs);
    log("info", "scheduler", "started", { intervalMs });
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    const now = new Date();
    const dueTasks = await this.prisma.task.findMany({
      where: {
        status: "active",
        deletedAt: null,
        nextRunAt: { lte: now },
      },
    });

    let runsCreated = 0;

    for (const task of dueTasks) {
      const schedule = task.schedule as { cron: string };
      const nextRunAt = getNextRunAt(schedule.cron, now);

      await this.prisma.task.update({
        where: { id: task.id },
        data: { nextRunAt, lastRunAt: now },
      });

      if (task.concurrencyPolicy === "skip_if_running") {
        const runningCount = await this.prisma.run.count({
          where: { taskId: task.id, status: "RUNNING" },
        });
        if (runningCount > 0) {
          log("info", "scheduler", "skipped due to running run", {
            taskId: task.id.toString(),
          });
          continue;
        }
      }

      await this.prisma.run.create({
        data: {
          taskId: task.id,
          trigger: "cron",
          status: "PENDING",
          scheduledFor: now,
          attemptNo: 1,
        },
      });
      runsCreated++;
    }

    if (dueTasks.length > 0) {
      log("info", "scheduler", "tick completed", {
        tasksScanned: dueTasks.length,
        runsCreated,
      });
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/scheduler.test.ts`
Expected: All 2 tests PASS

- [ ] **Step 5: Wire scheduler into index.ts**

Add to `apps/api/src/index.ts` in `buildApp()`:

```typescript
import { SchedulerService } from "./modules/scheduler/scheduler.service.js";

// After routes registration:
const scheduler = new SchedulerService(app.prisma);
app.decorate("scheduler", scheduler);

app.addHook("onReady", () => {
  if (process.env.NODE_ENV !== "test") {
    scheduler.start(config.schedulerIntervalMs);
  }
});

app.addHook("onClose", () => {
  scheduler.stop();
});
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/scheduler/ tests/api/integration/scheduler.test.ts apps/api/src/index.ts
git commit -m "feat: add scheduler service with 30s tick and concurrency policy"
```

---

### Task 13: Run Dispatcher (SKIP LOCKED)

**Files:**
- Create: `apps/api/src/modules/dispatcher/dispatcher.service.ts`
- Modify: `apps/api/src/index.ts`
- Test: `tests/api/integration/dispatcher.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/api/integration/dispatcher.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/setup.js";

describe("DispatcherService", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.prisma.taskRunLog.deleteMany();
    await app.prisma.run.deleteMany();
    await app.prisma.task.deleteMany();
  });

  it("claims PENDING runs and marks them RUNNING", async () => {
    const task = await app.prisma.task.create({
      data: {
        name: "test",
        agentType: "codex",
        taskPrompt: "test",
        schedule: { cron: "* * * * *" },
        sessionPolicy: "always_new",
        environment: {},
        permissionPolicy: {},
        notificationConfig: { enabled: false, channels: [], onStatuses: [] },
        status: "active",
        ownerId: 1n,
        createdById: 1n,
      },
    });

    await app.prisma.run.create({
      data: {
        taskId: task.id,
        trigger: "manual",
        status: "PENDING",
        scheduledFor: new Date(Date.now() - 1000),
        attemptNo: 1,
      },
    });

    const { DispatcherService } = await import(
      "../../apps/api/src/modules/dispatcher/dispatcher.service.js"
    );
    const mockRunner = { execute: vi.fn().mockResolvedValue(undefined) };
    const dispatcher = new DispatcherService(app.prisma, mockRunner as any, {
      maxConcurrent: 3,
      batchSize: 5,
      workerId: "test-worker",
    });

    await dispatcher.tick();

    const runs = await app.prisma.run.findMany();
    expect(runs[0].status).toBe("RUNNING");
    expect(runs[0].claimedBy).toBe("test-worker");
    expect(mockRunner.execute).toHaveBeenCalledTimes(1);
  });

  it("respects maxConcurrent limit", async () => {
    const task = await app.prisma.task.create({
      data: {
        name: "test",
        agentType: "codex",
        taskPrompt: "test",
        schedule: { cron: "* * * * *" },
        sessionPolicy: "always_new",
        environment: {},
        permissionPolicy: {},
        notificationConfig: { enabled: false, channels: [], onStatuses: [] },
        status: "active",
        ownerId: 1n,
        createdById: 1n,
      },
    });

    for (let i = 0; i < 5; i++) {
      await app.prisma.run.create({
        data: {
          taskId: task.id,
          trigger: "manual",
          status: "PENDING",
          scheduledFor: new Date(Date.now() - 1000),
          attemptNo: 1,
        },
      });
    }

    const { DispatcherService } = await import(
      "../../apps/api/src/modules/dispatcher/dispatcher.service.js"
    );
    const mockRunner = { execute: vi.fn().mockResolvedValue(undefined) };
    const dispatcher = new DispatcherService(app.prisma, mockRunner as any, {
      maxConcurrent: 2,
      batchSize: 5,
      workerId: "test-worker",
    });

    await dispatcher.tick();

    const running = await app.prisma.run.count({ where: { status: "RUNNING" } });
    expect(running).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/dispatcher.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement dispatcher.service.ts**

```typescript
// apps/api/src/modules/dispatcher/dispatcher.service.ts
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { log } from "../../logger.js";

export interface AgentRunnerInterface {
  execute(runId: bigint): Promise<void>;
}

export interface DispatcherOptions {
  maxConcurrent: number;
  batchSize: number;
  workerId: string;
}

export class DispatcherService {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaClient,
    private runner: AgentRunnerInterface,
    private options: DispatcherOptions
  ) {}

  start(intervalMs: number) {
    this.timer = setInterval(() => this.tick().catch((e) => {
      log("error", "dispatcher", "tick failed", { error: String(e) });
    }), intervalMs);
    log("info", "dispatcher", "started", { intervalMs });
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    const runningCount = await this.prisma.run.count({
      where: { status: "RUNNING", claimedBy: this.options.workerId },
    });

    const slots = this.options.maxConcurrent - runningCount;
    if (slots <= 0) return;

    const batchSize = Math.min(slots, this.options.batchSize);

    const claimed = await this.prisma.$queryRaw<Array<{ id: bigint }>>`
      SELECT id FROM runs
      WHERE status = 'PENDING'
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;

    if (claimed.length === 0) return;

    const ids = claimed.map((r) => r.id);
    const now = new Date();

    await this.prisma.run.updateMany({
      where: { id: { in: ids } },
      data: {
        status: "RUNNING",
        claimedBy: this.options.workerId,
        claimedAt: now,
        heartbeatAt: now,
        startedAt: now,
      },
    });

    log("info", "dispatcher", "claimed runs", { count: ids.length });

    for (const id of ids) {
      this.runner.execute(id).catch((e) => {
        log("error", "dispatcher", "runner execute failed", {
          runId: id.toString(),
          error: String(e),
        });
      });
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/dispatcher.test.ts`
Expected: All 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/dispatcher/ tests/api/integration/dispatcher.test.ts
git commit -m "feat: add dispatcher with SKIP LOCKED claim and concurrency limit"
```

---

### Task 14: Agent Runner + Codex Adapter + Mock Adapter

**Files:**
- Create: `apps/api/src/modules/runner/codex-adapter.ts`
- Create: `apps/api/src/modules/runner/mock-adapter.ts`
- Create: `apps/api/src/modules/runner/agent-runner.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Implement codex-adapter.ts**

```typescript
// apps/api/src/modules/runner/codex-adapter.ts
export interface AdapterResult {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface AgentAdapter {
  buildCommand(params: {
    prompt: string;
    workDir: string;
    sessionId?: string;
    environment: Record<string, string>;
    permissionPolicy: Record<string, unknown>;
  }): AdapterResult;
}

export class CodexAdapter implements AgentAdapter {
  buildCommand(params: {
    prompt: string;
    workDir: string;
    sessionId?: string;
    environment: Record<string, string>;
    permissionPolicy: Record<string, unknown>;
  }): AdapterResult {
    const args = ["--quiet", "--prompt", params.prompt];

    if (params.permissionPolicy?.autoApprove) {
      args.push("--auto-approve");
    }

    return {
      command: "codex",
      args,
      env: {
        ...params.environment,
        HOME: process.env.HOME || "",
        PATH: process.env.PATH || "",
      },
    };
  }
}
```

- [ ] **Step 2: Implement mock-adapter.ts**

```typescript
// apps/api/src/modules/runner/mock-adapter.ts
import type { AgentAdapter, AdapterResult } from "./codex-adapter.js";

export class MockCodexAdapter implements AgentAdapter {
  constructor(
    private exitCode: number = 0,
    private output: string = "mock output",
    private delayMs: number = 100
  ) {}

  buildCommand(params: {
    prompt: string;
    workDir: string;
  }): AdapterResult {
    return {
      command: "node",
      args: [
        "-e",
        `setTimeout(() => { process.stdout.write(${JSON.stringify(this.output)}); process.exit(${this.exitCode}); }, ${this.delayMs})`,
      ],
      env: {
        HOME: process.env.HOME || "",
        PATH: process.env.PATH || "",
      },
    };
  }
}
```

- [ ] **Step 3: Implement agent-runner.ts**

```typescript
// apps/api/src/modules/runner/agent-runner.ts
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { RunStatus, DEFAULTS, decrypt } from "@agentcron/shared";
import { RunStateMachine } from "../run/run-state-machine.js";
import type { LogCollector } from "../log-collector/log-collector.js";
import type { AgentAdapter } from "./codex-adapter.js";
import { log } from "../../logger.js";
import type { DispatcherService, AgentRunnerInterface } from "../dispatcher/dispatcher.service.js";

export class AgentRunner implements AgentRunnerInterface {
  private processes = new Map<string, ChildProcess>();
  private heartbeatTimers = new Map<string, ReturnType<typeof setInterval>>();
  private stateMachine: RunStateMachine;

  constructor(
    private prisma: PrismaClient,
    private adapter: AgentAdapter,
    private logCollector: LogCollector,
    private dataDir: string,
    private masterKey: string
  ) {
    this.stateMachine = new RunStateMachine(prisma);
  }

  async execute(runId: bigint): Promise<void> {
    const run = await this.prisma.run.findUnique({
      where: { id: runId },
      include: { task: true },
    });

    if (!run || !run.task) {
      log("error", "runner", "run or task not found", { runId: runId.toString() });
      return;
    }

    const workDir = join(this.dataDir, "workspaces", runId.toString());
    await mkdir(workDir, { recursive: true });

    const prompt = decrypt(run.task.taskPrompt, this.masterKey);
    const envStr = decrypt(run.task.environment as string, this.masterKey);
    const environment = typeof envStr === "string" ? JSON.parse(envStr) : envStr;

    const { command, args, env } = this.adapter.buildCommand({
      prompt,
      workDir,
      sessionId: run.sessionId || undefined,
      environment,
      permissionPolicy: run.task.permissionPolicy as Record<string, unknown>,
    });

    const child = spawn(command, args, {
      cwd: workDir,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const key = runId.toString();
    this.processes.set(key, child);

    this.logCollector.attach(runId, child);

    const heartbeat = setInterval(async () => {
      try {
        await this.prisma.run.update({
          where: { id: runId },
          data: { heartbeatAt: new Date() },
        });
      } catch {
        // ignore heartbeat failure
      }
    }, DEFAULTS.HEARTBEAT_INTERVAL_MS);
    this.heartbeatTimers.set(key, heartbeat);

    const timeoutMs = (run.task.timeoutSeconds || DEFAULTS.TIMEOUT_SECONDS) * 1000;
    const timeoutTimer = setTimeout(() => {
      log("warn", "runner", "run timed out", { runId: key });
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, DEFAULTS.GRACEFUL_SHUTDOWN_MS);
    }, timeoutMs);

    child.on("exit", async (code, signal) => {
      clearTimeout(timeoutTimer);
      clearInterval(heartbeat);
      this.heartbeatTimers.delete(key);
      this.processes.delete(key);
      await this.logCollector.flush(runId);

      let targetStatus: string;
      const context: Record<string, unknown> = {};

      if (signal === "SIGTERM" || signal === "SIGKILL") {
        targetStatus = RunStatus.TIMEOUT;
        context.errorMessage = `Process killed by ${signal}`;
      } else if (code === 0) {
        targetStatus = RunStatus.SUCCESS;
      } else {
        targetStatus = RunStatus.FAILED;
        context.errorMessage = `Process exited with code ${code}`;
      }

      try {
        await this.stateMachine.transition(runId, targetStatus, context);
      } catch (e) {
        log("error", "runner", "transition failed", {
          runId: key,
          error: String(e),
        });
      }
    });
  }

  async cancelRun(runId: bigint) {
    const key = runId.toString();
    const child = this.processes.get(key);
    if (child) {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, DEFAULTS.GRACEFUL_SHUTDOWN_MS);
    }
  }

  getActiveCount(): number {
    return this.processes.size;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/runner/
git commit -m "feat: add AgentRunner, CodexAdapter, and MockCodexAdapter"
```

---

### Task 15: Log Collector (Buffer + Flush + SSE)

**Files:**
- Create: `apps/api/src/modules/log-collector/log-collector.ts`
- Test: `tests/api/integration/log-collector.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/api/integration/log-collector.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/setup.js";
import { Readable } from "node:stream";

describe("LogCollector", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.prisma.taskRunLog.deleteMany();
    await app.prisma.run.deleteMany();
    await app.prisma.task.deleteMany();
  });

  it("buffers and flushes logs to the database", async () => {
    const task = await app.prisma.task.create({
      data: {
        name: "test",
        agentType: "codex",
        taskPrompt: "test",
        schedule: { cron: "* * * * *" },
        sessionPolicy: "always_new",
        environment: {},
        permissionPolicy: {},
        notificationConfig: { enabled: false, channels: [], onStatuses: [] },
        status: "active",
        ownerId: 1n,
        createdById: 1n,
      },
    });

    const run = await app.prisma.run.create({
      data: {
        taskId: task.id,
        trigger: "manual",
        status: "RUNNING",
        scheduledFor: new Date(),
        attemptNo: 1,
      },
    });

    const { LogCollector } = await import(
      "../../apps/api/src/modules/log-collector/log-collector.js"
    );
    const collector = new LogCollector(app.prisma);

    collector.append(run.id, "agent_output", "line 1\n");
    collector.append(run.id, "agent_output", "line 2\n");
    await collector.flush(run.id);

    const logs = await app.prisma.taskRunLog.findMany({
      where: { runId: run.id },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const content = logs.map((l) => l.content).join("");
    expect(content).toContain("line 1");
    expect(content).toContain("line 2");
  });

  it("sanitizes secrets from log content", async () => {
    const task = await app.prisma.task.create({
      data: {
        name: "test2",
        agentType: "codex",
        taskPrompt: "test",
        schedule: { cron: "* * * * *" },
        sessionPolicy: "always_new",
        environment: {},
        permissionPolicy: {},
        notificationConfig: { enabled: false, channels: [], onStatuses: [] },
        status: "active",
        ownerId: 1n,
        createdById: 1n,
      },
    });

    const run = await app.prisma.run.create({
      data: {
        taskId: task.id,
        trigger: "manual",
        status: "RUNNING",
        scheduledFor: new Date(),
        attemptNo: 1,
      },
    });

    const { LogCollector } = await import(
      "../../apps/api/src/modules/log-collector/log-collector.js"
    );
    const collector = new LogCollector(app.prisma);

    collector.append(run.id, "agent_output", "Using key sk-abc123secretkey\n");
    await collector.flush(run.id);

    const logs = await app.prisma.taskRunLog.findMany({
      where: { runId: run.id },
    });
    expect(logs[0].content).toContain("[REDACTED]");
    expect(logs[0].content).not.toContain("sk-abc123secretkey");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/log-collector.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement log-collector.ts**

```typescript
// apps/api/src/modules/log-collector/log-collector.ts
import type { PrismaClient } from "@prisma/client";
import type { ChildProcess } from "node:child_process";
import { sanitize, DEFAULTS } from "@agentcron/shared";
import type { LogType } from "@agentcron/shared";
import { log } from "../../logger.js";

interface LogBuffer {
  content: string;
  logType: LogType;
  byteSize: number;
}

export class LogCollector {
  private buffers = new Map<string, LogBuffer[]>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(private prisma: PrismaClient) {}

  attach(runId: bigint, child: ChildProcess) {
    const key = runId.toString();

    child.stdout?.on("data", (chunk: Buffer) => {
      this.append(runId, "agent_output", chunk.toString());
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      this.append(runId, "agent_error", chunk.toString());
    });

    const timer = setInterval(() => {
      this.flush(runId).catch((e) => {
        log("error", "log-collector", "flush failed", { runId: key, error: String(e) });
      });
    }, DEFAULTS.LOG_BUFFER_INTERVAL_MS);
    this.timers.set(key, timer);
  }

  append(runId: bigint, logType: LogType, content: string) {
    const key = runId.toString();
    if (!this.buffers.has(key)) {
      this.buffers.set(key, []);
    }
    const buffers = this.buffers.get(key)!;
    const last = buffers[buffers.length - 1];

    if (last && last.logType === logType && last.byteSize < DEFAULTS.LOG_BUFFER_MAX_BYTES) {
      last.content += content;
      last.byteSize += Buffer.byteLength(content);
    } else {
      buffers.push({
        content,
        logType,
        byteSize: Buffer.byteLength(content),
      });
    }

    const totalBytes = buffers.reduce((sum, b) => sum + b.byteSize, 0);
    if (totalBytes >= DEFAULTS.LOG_BUFFER_MAX_BYTES) {
      this.flush(runId).catch(() => {});
    }
  }

  async flush(runId: bigint) {
    const key = runId.toString();
    const buffers = this.buffers.get(key);
    if (!buffers || buffers.length === 0) return;

    this.buffers.set(key, []);

    const timer = this.timers.get(key);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(key);
    }

    for (const buf of buffers) {
      const sanitized = sanitize(buf.content);
      await this.prisma.taskRunLog.create({
        data: {
          runId,
          logType: buf.logType,
          content: sanitized,
        },
      });
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/log-collector.test.ts`
Expected: All 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/log-collector/ tests/api/integration/log-collector.test.ts
git commit -m "feat: add LogCollector with buffer/flush strategy and sanitization"
```

---

### Task 16: Artifact Store + Notifier

**Files:**
- Create: `apps/api/src/modules/artifact/artifact-store.ts`
- Create: `apps/api/src/modules/notifier/notifier.ts`
- Create: `apps/api/src/modules/notifier/webhook-channel.ts`
- Create: `apps/api/src/modules/notifier/feishu-channel.ts`
- Test: `tests/api/integration/notifier.test.ts`

- [ ] **Step 1: Implement artifact-store.ts**

```typescript
// apps/api/src/modules/artifact/artifact-store.ts
import { readdir, copyFile, stat, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { log } from "../../logger.js";

export class ArtifactStore {
  constructor(
    private prisma: PrismaClient,
    private dataDir: string
  ) {}

  async collect(runId: bigint) {
    const workDir = join(this.dataDir, "workspaces", runId.toString());
    const artifactDir = join(this.dataDir, "artifacts", runId.toString());

    try {
      await stat(workDir);
    } catch {
      return;
    }

    await mkdir(artifactDir, { recursive: true });

    const patterns = [".diff", ".patch", ".log", ".md", ".txt"];
    const files = await this.findFiles(workDir, patterns);

    for (const file of files) {
      const name = file.replace(workDir + "/", "");
      const dest = join(artifactDir, name);
      await mkdir(join(dest, ".."), { recursive: true });
      await copyFile(file, dest);

      await this.prisma.taskRunArtifact.create({
        data: {
          runId,
          artifactType: "file",
          name,
          storagePath: dest,
        },
      });
    }

    if (files.length > 0) {
      log("info", "artifact-store", "collected artifacts", {
        runId: runId.toString(),
        count: files.length,
      });
    }
  }

  private async findFiles(dir: string, patterns: string[]): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...(await this.findFiles(full, patterns)));
        } else if (patterns.some((p) => entry.name.endsWith(p))) {
          results.push(full);
        }
      }
    } catch {
      // ignore read errors
    }
    return results;
  }
}
```

- [ ] **Step 2: Write failing test for notifier**

```typescript
// tests/api/integration/notifier.test.ts
import { describe, it, expect, vi } from "vitest";
import { Notifier } from "../../apps/api/src/modules/notifier/notifier.js";
import type { NotificationConfig } from "@agentcron/shared";

describe("Notifier", () => {
  it("sends webhook notification", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 })
    );

    const notifier = new Notifier();
    const config: NotificationConfig = {
      enabled: true,
      channels: [{ type: "webhook", url: "https://example.com/hook" }],
      onStatuses: ["SUCCESS", "FAILED"],
    };

    await notifier.send(config, {
      taskName: "test-task",
      runId: "123",
      status: "FAILED",
      duration: 60,
      errorMessage: "exit code 1",
      resultSummary: null,
      runUrl: "http://localhost:3001/runs/123",
      triggeredAt: new Date().toISOString(),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const callArgs = fetchSpy.mock.calls[0];
    expect(callArgs[0]).toBe("https://example.com/hook");
    expect(callArgs[1]?.method).toBe("POST");

    fetchSpy.mockRestore();
  });

  it("skips notification when status not in onStatuses", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const notifier = new Notifier();
    const config: NotificationConfig = {
      enabled: true,
      channels: [{ type: "webhook", url: "https://example.com/hook" }],
      onStatuses: ["FAILED"],
    };

    await notifier.send(config, {
      taskName: "test-task",
      runId: "123",
      status: "SUCCESS",
      duration: 60,
      errorMessage: null,
      resultSummary: null,
      runUrl: "http://localhost:3001/runs/123",
      triggeredAt: new Date().toISOString(),
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("skips when not enabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const notifier = new Notifier();
    const config: NotificationConfig = {
      enabled: false,
      channels: [{ type: "webhook", url: "https://example.com/hook" }],
      onStatuses: ["FAILED"],
    };

    await notifier.send(config, {
      taskName: "test",
      runId: "1",
      status: "FAILED",
      duration: 0,
      errorMessage: null,
      resultSummary: null,
      runUrl: "",
      triggeredAt: "",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/notifier.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement webhook-channel.ts**

```typescript
// apps/api/src/modules/notifier/webhook-channel.ts
import { log } from "../../logger.js";

export async function sendWebhook(
  url: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch (e) {
    log("error", "webhook", "send failed", { url, error: String(e) });
    return false;
  }
}
```

- [ ] **Step 5: Implement feishu-channel.ts**

```typescript
// apps/api/src/modules/notifier/feishu-channel.ts
import { log } from "../../logger.js";

export async function sendFeishu(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const card = {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          tag: "plain_text",
          content: `AgentCron: ${payload.taskName} - ${payload.status}`,
        },
        template: payload.status === "SUCCESS" ? "green" : "red",
      },
      elements: [
        {
          tag: "div",
          fields: [
            { is_short: true, text: { tag: "lark_md", content: `**Task:** ${payload.taskName}` } },
            { is_short: true, text: { tag: "lark_md", content: `**Status:** ${payload.status}` } },
            { is_short: true, text: { tag: "lark_md", content: `**Duration:** ${payload.duration}s` } },
            { is_short: true, text: { tag: "lark_md", content: `**Run ID:** ${payload.runId}` } },
          ],
        },
        ...(payload.errorMessage
          ? [{ tag: "div", text: { tag: "lark_md", content: `**Error:** ${payload.errorMessage}` } }]
          : []),
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: { tag: "plain_text", content: "View Run" },
              url: payload.runUrl,
              type: "primary",
            },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch (e) {
    log("error", "feishu", "send failed", { error: String(e) });
    return false;
  }
}
```

- [ ] **Step 6: Implement notifier.ts**

```typescript
// apps/api/src/modules/notifier/notifier.ts
import type { NotificationConfig } from "@agentcron/shared";
import { sendWebhook } from "./webhook-channel.js";
import { sendFeishu } from "./feishu-channel.js";
import { log } from "../../logger.js";

export interface NotificationPayload {
  taskName: string;
  runId: string;
  status: string;
  duration: number;
  errorMessage: string | null;
  resultSummary: string | null;
  runUrl: string;
  triggeredAt: string;
}

export class Notifier {
  async send(
    config: NotificationConfig,
    payload: NotificationPayload
  ): Promise<void> {
    if (!config.enabled) return;
    if (!config.onStatuses.includes(payload.status)) return;

    for (const channel of config.channels) {
      let success = false;

      if (channel.type === "webhook") {
        success = await sendWebhook(channel.url, payload);
      } else if (channel.type === "feishu") {
        success = await sendFeishu(channel.url, payload);
      }

      if (!success) {
        log("warn", "notifier", "notification failed", {
          type: channel.type,
          runId: payload.runId,
        });
      }
    }
  }
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @agentcron/api test -- tests/api/integration/notifier.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/artifact/ apps/api/src/modules/notifier/ tests/api/integration/notifier.test.ts
git commit -m "feat: add ArtifactStore and Notifier with webhook/feishu channels"
```

---

### Task 17: Admin Routes + Fault Recovery + Wire Everything

**Files:**
- Create: `apps/api/src/modules/admin/admin.service.ts`
- Create: `apps/api/src/modules/admin/admin.routes.ts`
- Modify: `apps/api/src/index.ts` (wire all remaining pieces)

- [ ] **Step 1: Implement admin.service.ts**

```typescript
// apps/api/src/modules/admin/admin.service.ts
import type { PrismaClient } from "@prisma/client";
import { RunStatus } from "@agentcron/shared";

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", db: "connected" };
    } catch {
      return { status: "degraded", db: "disconnected" };
    }
  }

  async metrics() {
    const [running, pending, successLast24h, failedLast24h, totalTasks] =
      await Promise.all([
        this.prisma.run.count({ where: { status: RunStatus.RUNNING } }),
        this.prisma.run.count({ where: { status: RunStatus.PENDING } }),
        this.prisma.run.count({
          where: {
            status: RunStatus.SUCCESS,
            finishedAt: { gte: new Date(Date.now() - 86400000) },
          },
        }),
        this.prisma.run.count({
          where: {
            status: RunStatus.FAILED,
            finishedAt: { gte: new Date(Date.now() - 86400000) },
          },
        }),
        this.prisma.task.count({ where: { deletedAt: null } }),
      ]);

    const total24h = successLast24h + failedLast24h;
    const successRate = total24h > 0 ? ((successLast24h / total24h) * 100).toFixed(1) : "N/A";

    return {
      activeRuns: running,
      pendingRuns: pending,
      successRate24h: successRate,
      totalTasks,
    };
  }

  async queue() {
    const [pendingRuns, runningRuns] = await Promise.all([
      this.prisma.run.findMany({
        where: { status: RunStatus.PENDING },
        select: {
          id: true,
          taskId: true,
          scheduledFor: true,
          attemptNo: true,
          createdAt: true,
        },
        orderBy: { scheduledFor: "asc" },
        take: 50,
      }),
      this.prisma.run.findMany({
        where: { status: RunStatus.RUNNING },
        select: {
          id: true,
          taskId: true,
          claimedBy: true,
          startedAt: true,
          heartbeatAt: true,
        },
        orderBy: { startedAt: "asc" },
        take: 50,
      }),
    ]);

    return {
      pending: pendingRuns.map((r) => ({ ...r, id: r.id.toString(), taskId: r.taskId.toString() })),
      running: runningRuns.map((r) => ({ ...r, id: r.id.toString(), taskId: r.taskId.toString() })),
    };
  }

  async recoverStaleRuns(thresholdSeconds: number) {
    const threshold = new Date(Date.now() - thresholdSeconds * 1000);

    const staleRuns = await this.prisma.run.findMany({
      where: {
        status: RunStatus.RUNNING,
        heartbeatAt: { lt: threshold },
      },
      include: { task: { select: { maxRetries: true } } },
    });

    for (const run of staleRuns) {
      await this.prisma.run.update({
        where: { id: run.id },
        data: {
          status: RunStatus.SYSTEM_ERROR,
          finishedAt: new Date(),
          errorMessage: "Recovered after heartbeat timeout",
          duration: run.startedAt
            ? Math.floor((Date.now() - run.startedAt.getTime()) / 1000)
            : null,
        },
      });

      await this.prisma.taskRunLog.create({
        data: {
          runId: run.id,
          logType: "system",
          content: `State transition: RUNNING → SYSTEM_ERROR (heartbeat timeout recovery)`,
        },
      });

      if (run.attemptNo < (run.task?.maxRetries || 0)) {
        const backoffS = 30 * Math.pow(4, run.attemptNo - 1);
        await this.prisma.run.create({
          data: {
            taskId: run.taskId,
            trigger: "retry",
            status: RunStatus.PENDING,
            scheduledFor: new Date(Date.now() + backoffS * 1000),
            attemptNo: run.attemptNo + 1,
          },
        });
      }
    }

    return staleRuns.length;
  }
}
```

- [ ] **Step 2: Implement admin.routes.ts**

```typescript
// apps/api/src/modules/admin/admin.routes.ts
import type { FastifyInstance } from "fastify";
import { AdminService } from "./admin.service.js";

export default async function adminRoutes(app: FastifyInstance) {
  const adminService = new AdminService(app.prisma);

  app.get("/health", async (request) => {
    const data = await adminService.health();
    return { code: 0, data, message: "ok", traceId: request.traceId };
  });

  app.get("/metrics", { preHandler: [app.authenticate] }, async (request) => {
    const data = await adminService.metrics();
    return { code: 0, data, message: "ok", traceId: request.traceId };
  });

  app.get("/queue", { preHandler: [app.authenticate] }, async (request) => {
    const data = await adminService.queue();
    return { code: 0, data, message: "ok", traceId: request.traceId };
  });
}
```

- [ ] **Step 3: Wire everything in index.ts — final version**

```typescript
// apps/api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { loadConfig } from "./config.js";
import prismaPlugin from "./plugins/prisma.js";
import traceIdPlugin from "./plugins/trace-id.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./modules/auth/auth.routes.js";
import taskRoutes from "./modules/task/task.routes.js";
import runRoutes, { taskRunRoutes } from "./modules/run/run.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import { SchedulerService } from "./modules/scheduler/scheduler.service.js";
import { DispatcherService } from "./modules/dispatcher/dispatcher.service.js";
import { AgentRunner } from "./modules/runner/agent-runner.js";
import { CodexAdapter } from "./modules/runner/codex-adapter.js";
import { LogCollector } from "./modules/log-collector/log-collector.js";
import { ArtifactStore } from "./modules/artifact/artifact-store.js";
import { Notifier } from "./modules/notifier/notifier.js";
import { AdminService } from "./modules/admin/admin.service.js";
import { DEFAULTS } from "@agentcron/shared";
import { log } from "./logger.js";
import { hostname } from "node:os";

export async function buildApp() {
  const config = loadConfig();
  const app = Fastify({ logger: false });

  app.decorate("config", config);

  await app.register(cors, { origin: true });
  await app.register(traceIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(taskRoutes, { prefix: "/api/tasks" });
  await app.register(taskRunRoutes, { prefix: "/api/tasks/:id/runs" });
  await app.register(runRoutes, { prefix: "/api/runs" });
  await app.register(adminRoutes, { prefix: "/api/admin" });

  return app;
}

async function main() {
  const config = loadConfig();
  const app = await buildApp();

  const logCollector = new LogCollector(app.prisma);
  const adapter = new CodexAdapter();
  const runner = new AgentRunner(
    app.prisma,
    adapter,
    logCollector,
    config.dataDir,
    config.masterKey
  );

  const workerId = `worker-${hostname()}-${process.pid}`;
  const dispatcher = new DispatcherService(app.prisma, runner, {
    maxConcurrent: config.maxConcurrentRuns,
    batchSize: config.dispatcherBatchSize,
    workerId,
  });

  const scheduler = new SchedulerService(app.prisma);
  const adminService = new AdminService(app.prisma);

  const recovered = await adminService.recoverStaleRuns(
    DEFAULTS.HEARTBEAT_RECOVERY_THRESHOLD_S
  );
  if (recovered > 0) {
    log("info", "startup", "recovered stale runs", { count: recovered });
  }

  scheduler.start(config.schedulerIntervalMs);
  dispatcher.start(config.dispatcherIntervalMs);

  const address = await app.listen({ port: config.port, host: "0.0.0.0" });
  log("info", "server", "started", { address, workerId });

  const shutdown = async () => {
    log("info", "server", "shutting down");
    scheduler.stop();
    dispatcher.stop();
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  log("error", "server", "failed to start", { error: String(err) });
  process.exit(1);
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/admin/ apps/api/src/index.ts
git commit -m "feat: add admin routes, fault recovery, and wire all backend modules"
```

---

### Task 18: Frontend — Next.js Setup + Login Page

**Files:**
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/auth-context.tsx`
- Create: `apps/web/src/components/nav-bar.tsx`
- Create: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: Create Next.js config files**

```typescript
// apps/web/next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
    ];
  },
};

export default config;
```

```typescript
// apps/web/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

```javascript
// apps/web/postcss.config.js
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

```css
/* apps/web/src/app/globals.css */
@import "tailwindcss";
```

- [ ] **Step 2: Implement api-client.ts**

```typescript
// apps/web/src/lib/api-client.ts
export class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ code: number; data: T; message: string }> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(path, { ...options, headers });
    const json = await res.json();

    if (!res.ok || json.code !== 0) {
      throw new Error(json.message || "Request failed");
    }

    return json;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  del<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();
```

- [ ] **Step 3: Implement auth-context.tsx**

```tsx
// apps/web/src/lib/auth-context.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { api } from "./api-client";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.setToken(token);
      api
        .get<User>("/api/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("token");
          api.setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>(
      "/api/auth/login",
      { username, password }
    );
    localStorage.setItem("token", res.data.token);
    api.setToken(res.data.token);
    setUser(res.data.user);
    router.push("/tasks");
  };

  const logout = () => {
    localStorage.removeItem("token");
    api.setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 4: Implement layout.tsx and root page**

```tsx
// apps/web/src/app/layout.tsx
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentCron",
  description: "Scheduled execution platform for AI Coding Agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

```tsx
// apps/web/src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/tasks");
}
```

- [ ] **Step 5: Implement nav-bar.tsx**

```tsx
// apps/web/src/components/nav-bar.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function NavBar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/tasks" className="text-lg font-bold text-gray-900">
          AgentCron
        </Link>
        <Link
          href="/tasks"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Tasks
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{user.username}</span>
        <button
          onClick={logout}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 6: Implement login page**

```tsx
// apps/web/src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">AgentCron</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify frontend starts**

Run: `pnpm --filter @agentcron/web dev`
Expected: Next.js dev server on port 3001. Visit `http://localhost:3001/login` and see login form.

- [ ] **Step 8: Commit**

```bash
git add apps/web/
git commit -m "feat: add Next.js frontend with login page and auth context"
```

---

### Task 19: Frontend — Task List + Task Detail + Create/Edit

**Files:**
- Create: `apps/web/src/app/tasks/page.tsx`
- Create: `apps/web/src/app/tasks/new/page.tsx`
- Create: `apps/web/src/app/tasks/[id]/page.tsx`
- Create: `apps/web/src/app/tasks/[id]/edit/page.tsx`
- Create: `apps/web/src/components/task-card.tsx`
- Create: `apps/web/src/components/task-form.tsx`

- [ ] **Step 1: Implement task-card.tsx**

```tsx
// apps/web/src/components/task-card.tsx
"use client";

import Link from "next/link";
import { api } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface TaskCardProps {
  task: {
    id: string;
    name: string;
    agentType: string;
    status: string;
    schedule: { cron: string };
    lastRunAt: string | null;
    nextRunAt: string | null;
  };
  onRefresh: () => void;
}

export function TaskCard({ task, onRefresh }: TaskCardProps) {
  const router = useRouter();

  const handleAction = async (action: "enable" | "disable" | "trigger") => {
    await api.post(`/api/tasks/${task.id}:${action}`);
    onRefresh();
  };

  const statusColor =
    task.status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/tasks/${task.id}`}
            className="text-lg font-medium text-gray-900 hover:text-blue-600"
          >
            {task.name}
          </Link>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <span>{task.agentType}</span>
            <span>·</span>
            <span>{task.schedule.cron}</span>
          </div>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}
        >
          {task.status}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {task.status === "paused" ? (
          <button
            onClick={() => handleAction("enable")}
            className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
          >
            Enable
          </button>
        ) : (
          <button
            onClick={() => handleAction("disable")}
            className="px-3 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
          >
            Pause
          </button>
        )}
        <button
          onClick={() => handleAction("trigger")}
          className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
        >
          Trigger
        </button>
        <button
          onClick={() => router.push(`/tasks/${task.id}/edit`)}
          className="px-3 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement task-form.tsx**

```tsx
// apps/web/src/components/task-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

interface TaskFormProps {
  initial?: {
    name: string;
    description: string;
    agentType: string;
    project: string;
    taskPrompt: string;
    schedule: { cron: string };
    sessionPolicy: string;
    concurrencyPolicy: string;
    timeoutSeconds: number;
    maxRetries: number;
    notificationConfig: { enabled: boolean; channels: any[]; onStatuses: string[] };
  };
  taskId?: string;
}

export function TaskForm({ initial, taskId }: TaskFormProps) {
  const router = useRouter();
  const isEdit = !!taskId;

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    agentType: initial?.agentType ?? "codex",
    project: initial?.project ?? "",
    taskPrompt: initial?.taskPrompt ?? "",
    cron: initial?.schedule?.cron ?? "0 9 * * 1-5",
    sessionPolicy: initial?.sessionPolicy ?? "always_new",
    concurrencyPolicy: initial?.concurrencyPolicy ?? "skip_if_running",
    timeoutSeconds: initial?.timeoutSeconds ?? 3600,
    maxRetries: initial?.maxRetries ?? 0,
    notifyEnabled: initial?.notificationConfig?.enabled ?? false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      name: form.name,
      description: form.description || undefined,
      agentType: form.agentType,
      project: form.project || undefined,
      taskPrompt: form.taskPrompt,
      schedule: { cron: form.cron },
      sessionPolicy: form.sessionPolicy,
      concurrencyPolicy: form.concurrencyPolicy,
      timeoutSeconds: form.timeoutSeconds,
      maxRetries: form.maxRetries,
      environment: {},
      permissionPolicy: {},
      notificationConfig: {
        enabled: form.notifyEnabled,
        channels: [],
        onStatuses: ["FAILED", "TIMEOUT", "SYSTEM_ERROR"],
      },
    };

    try {
      if (isEdit) {
        await api.patch(`/api/tasks/${taskId}`, payload);
      } else {
        await api.post("/api/tasks", payload);
      }
      router.push("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input value={form.name} onChange={set("name")} required
          className="w-full px-3 py-2 border rounded-md" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={set("description")} rows={2}
          className="w-full px-3 py-2 border rounded-md" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
        <textarea value={form.taskPrompt} onChange={set("taskPrompt")} required rows={6}
          className="w-full px-3 py-2 border rounded-md font-mono text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cron Schedule</label>
          <input value={form.cron} onChange={set("cron")} required
            className="w-full px-3 py-2 border rounded-md font-mono" placeholder="0 9 * * 1-5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Agent Type</label>
          <input value={form.agentType} onChange={set("agentType")} required
            className="w-full px-3 py-2 border rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Policy</label>
          <select value={form.sessionPolicy} onChange={set("sessionPolicy")}
            className="w-full px-3 py-2 border rounded-md">
            <option value="always_new">Always New</option>
            <option value="reuse_fixed">Reuse Fixed</option>
            <option value="reuse_last_success">Reuse Last Success</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Concurrency Policy</label>
          <select value={form.concurrencyPolicy} onChange={set("concurrencyPolicy")}
            className="w-full px-3 py-2 border rounded-md">
            <option value="skip_if_running">Skip If Running</option>
            <option value="queue_if_running">Queue If Running</option>
            <option value="allow_parallel">Allow Parallel</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (seconds)</label>
          <input type="number" value={form.timeoutSeconds}
            onChange={(e) => setForm((f) => ({ ...f, timeoutSeconds: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Retries</label>
          <input type="number" value={form.maxRetries}
            onChange={(e) => setForm((f) => ({ ...f, maxRetries: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border rounded-md" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Implement task list page**

```tsx
// apps/web/src/app/tasks/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { NavBar } from "@/components/nav-bar";
import { TaskCard } from "@/components/task-card";
import { useRouter } from "next/navigation";

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await api.get<{ items: any[] }>("/api/tasks");
      setTasks(res.data.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) fetchTasks();
  }, [user, authLoading]);

  if (authLoading || !user) return null;

  return (
    <>
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <Link
            href="/tasks/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            New Task
          </Link>
        </div>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500">No tasks yet. Create your first task.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onRefresh={fetchTasks} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Implement create task page**

```tsx
// apps/web/src/app/tasks/new/page.tsx
"use client";

import { NavBar } from "@/components/nav-bar";
import { TaskForm } from "@/components/task-form";

export default function NewTaskPage() {
  return (
    <>
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Task</h1>
        <TaskForm />
      </div>
    </>
  );
}
```

- [ ] **Step 5: Implement task detail page**

```tsx
// apps/web/src/app/tasks/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { NavBar } from "@/components/nav-bar";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    api.get(`/api/tasks/${id}`).then((res) => setTask(res.data));
    api.get<{ items: any[] }>(`/api/tasks/${id}/runs`).then((res) => setRuns(res.data.items));
  }, [id]);

  if (!task) return <><NavBar /><div className="p-8">Loading...</div></>;

  return (
    <>
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{task.name}</h1>
          <Link
            href={`/tasks/${id}/edit`}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
          >
            Edit
          </Link>
        </div>

        <div className="bg-white rounded-lg border p-4 mb-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium">{task.status}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Agent Type</dt>
              <dd className="font-medium">{task.agentType}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Schedule</dt>
              <dd className="font-mono">{task.schedule?.cron}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Session Policy</dt>
              <dd>{task.sessionPolicy}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <dt className="text-sm text-gray-500 mb-1">Prompt</dt>
            <dd className="text-sm font-mono bg-gray-50 p-3 rounded whitespace-pre-wrap">
              {task.taskPrompt}
            </dd>
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-3">Run History</h2>
        {runs.length === 0 ? (
          <p className="text-gray-500 text-sm">No runs yet.</p>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">Run ID</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Trigger</th>
                  <th className="text-left px-4 py-2">Duration</th>
                  <th className="text-left px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run: any) => (
                  <tr key={run.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/runs/${run.id}`} className="text-blue-600 hover:underline">
                        #{run.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{run.status}</td>
                    <td className="px-4 py-2">{run.trigger}</td>
                    <td className="px-4 py-2">{run.duration ? `${run.duration}s` : "-"}</td>
                    <td className="px-4 py-2">{new Date(run.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 6: Implement edit task page**

```tsx
// apps/web/src/app/tasks/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { NavBar } from "@/components/nav-bar";
import { TaskForm } from "@/components/task-form";

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);

  useEffect(() => {
    api.get(`/api/tasks/${id}`).then((res) => setTask(res.data));
  }, [id]);

  if (!task) return <><NavBar /><div className="p-8">Loading...</div></>;

  return (
    <>
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit: {task.name}</h1>
        <TaskForm initial={task} taskId={id} />
      </div>
    </>
  );
}
```

- [ ] **Step 7: Verify pages render in browser**

Run: `pnpm dev:api` (in one terminal) and `pnpm dev:web` (in another)
Visit `http://localhost:3001/login` → login → see task list → create task → view detail.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/
git commit -m "feat: add task list, detail, create, and edit pages"
```

---

### Task 20: Frontend — Run Detail Page with SSE Log Viewer

**Files:**
- Create: `apps/web/src/lib/use-sse.ts`
- Create: `apps/web/src/components/log-viewer.tsx`
- Create: `apps/web/src/components/run-timeline.tsx`
- Create: `apps/web/src/components/artifact-list.tsx`
- Create: `apps/web/src/app/runs/[id]/page.tsx`

- [ ] **Step 1: Implement SSE hook**

```typescript
// apps/web/src/lib/use-sse.ts
"use client";

import { useEffect, useRef, useState } from "react";

export interface LogEntry {
  id: string;
  logType: string;
  content: string | null;
  metadata: unknown;
  createdAt: string;
}

export function useSSE(url: string | null) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      const entry: LogEntry = JSON.parse(event.data);
      setLogs((prev) => [...prev, entry]);
    };

    es.addEventListener("done", (event) => {
      setDone(true);
      es.close();
    });

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [url]);

  return { logs, done };
}
```

- [ ] **Step 2: Implement log-viewer.tsx**

```tsx
// apps/web/src/components/log-viewer.tsx
"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/lib/use-sse";

interface LogViewerProps {
  logs: LogEntry[];
  done: boolean;
}

export function LogViewer({ logs, done }: LogViewerProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const typeColor: Record<string, string> = {
    agent_output: "text-gray-200",
    agent_error: "text-red-400",
    system: "text-blue-400",
    tool_call: "text-yellow-400",
    heartbeat: "text-gray-600",
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-[600px] overflow-y-auto">
      {logs.length === 0 && !done && (
        <p className="text-gray-500">Waiting for logs...</p>
      )}
      {logs.map((log) => (
        <div key={log.id} className={`${typeColor[log.logType] || "text-gray-200"} whitespace-pre-wrap`}>
          <span className="text-gray-600 text-xs mr-2">
            [{new Date(log.createdAt).toLocaleTimeString()}]
          </span>
          {log.content}
        </div>
      ))}
      {done && (
        <div className="text-green-400 mt-2 border-t border-gray-700 pt-2">
          --- Stream ended ---
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
```

- [ ] **Step 3: Implement run-timeline.tsx**

```tsx
// apps/web/src/components/run-timeline.tsx
"use client";

interface TimelineProps {
  run: {
    status: string;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    duration: number | null;
  };
}

export function RunTimeline({ run }: TimelineProps) {
  const steps = [
    { label: "Created", time: run.createdAt, active: true },
    { label: "Started", time: run.startedAt, active: !!run.startedAt },
    { label: "Finished", time: run.finishedAt, active: !!run.finishedAt },
  ];

  const statusColor: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    RUNNING: "bg-blue-100 text-blue-800",
    SUCCESS: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    TIMEOUT: "bg-orange-100 text-orange-800",
    CANCELLED: "bg-gray-100 text-gray-800",
    SYSTEM_ERROR: "bg-red-100 text-red-800",
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColor[run.status] || "bg-gray-100"}`}>
          {run.status}
        </span>
        {run.duration !== null && (
          <span className="text-sm text-gray-500">{run.duration}s</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${step.active ? "bg-blue-500" : "bg-gray-300"}`} />
            <div>
              <p className="text-xs text-gray-500">{step.label}</p>
              <p className="text-xs">{step.time ? new Date(step.time).toLocaleString() : "-"}</p>
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement artifact-list.tsx**

```tsx
// apps/web/src/components/artifact-list.tsx
"use client";

interface ArtifactListProps {
  runId: string;
  artifacts: Array<{
    id: string;
    name: string;
    artifactType: string;
    createdAt: string;
  }>;
}

export function ArtifactList({ runId, artifacts }: ArtifactListProps) {
  if (artifacts.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Artifacts</h3>
      <ul className="space-y-2">
        {artifacts.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm">
            <span>{a.name}</span>
            <a
              href={`/api/runs/${runId}/artifacts/${a.id}`}
              className="text-blue-600 hover:underline"
              download
            >
              Download
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Implement run detail page**

```tsx
// apps/web/src/app/runs/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useSSE } from "@/lib/use-sse";
import { NavBar } from "@/components/nav-bar";
import { RunTimeline } from "@/components/run-timeline";
import { LogViewer } from "@/components/log-viewer";
import { ArtifactList } from "@/components/artifact-list";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<any>(null);
  const [artifacts, setArtifacts] = useState<any[]>([]);

  const isStreaming = run && (run.status === "PENDING" || run.status === "RUNNING");
  const { logs, done } = useSSE(
    isStreaming ? `/api/runs/${id}/logs/stream` : null
  );

  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get(`/api/runs/${id}`).then((res) => setRun(res.data));
  }, [id]);

  useEffect(() => {
    if (run && !isStreaming) {
      api
        .get<{ items: any[] }>(`/api/runs/${id}/logs?pageSize=200`)
        .then((res) => setHistoryLogs(res.data.items));
    }
  }, [run, isStreaming, id]);

  if (!run) return <><NavBar /><div className="p-8">Loading...</div></>;

  const displayLogs = isStreaming ? logs : historyLogs;

  const handleCancel = async () => {
    await api.post(`/api/runs/${id}:cancel`);
    const res = await api.get(`/api/runs/${id}`);
    setRun(res.data);
  };

  const handleRerun = async () => {
    await api.post(`/api/runs/${id}:rerun`);
  };

  return (
    <>
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Run #{id}
            {run.task && (
              <span className="text-lg text-gray-500 ml-2">({run.task.name})</span>
            )}
          </h1>
          <div className="flex gap-2">
            {(run.status === "PENDING" || run.status === "RUNNING") && (
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleRerun}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
            >
              Rerun
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <RunTimeline run={run} />

          {run.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {run.errorMessage}
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Logs</h2>
            <LogViewer logs={displayLogs} done={done || !isStreaming} />
          </div>

          <ArtifactList runId={id} artifacts={artifacts} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Verify run detail page in browser**

Run: API + Web dev servers. Create a task, trigger it, navigate to run detail. Verify SSE log stream renders (if codex is installed) or verify page structure renders correctly.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/
git commit -m "feat: add run detail page with SSE log viewer, timeline, and artifacts"
```

---

### Task 21: Docker Compose & Dockerfile

**Files:**
- Modify: `docker-compose.yml`
- Create: `Dockerfile`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
# Dockerfile
FROM node:20-slim AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm db:generate
RUN pnpm build

FROM base AS api
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]

FROM base AS web
WORKDIR /app
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/apps/web/node_modules ./node_modules
CMD ["npx", "next", "start"]
```

- [ ] **Step 2: Update docker-compose.yml**

```yaml
# docker-compose.yml
services:
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-password}
      MYSQL_DATABASE: agentcron
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build:
      context: .
      target: api
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD:-password}@mysql:3306/agentcron
      MASTER_KEY: ${MASTER_KEY}
      JWT_SECRET: ${JWT_SECRET}
      DATA_DIR: /data
      PORT: "3000"
    volumes:
      - agentcron-data:/data
    depends_on:
      mysql:
        condition: service_healthy

  web:
    build:
      context: .
      target: web
    ports:
      - "3001:3000"
    depends_on:
      - api

volumes:
  mysql-data:
  agentcron-data:
```

- [ ] **Step 3: Verify compose builds**

Run: `docker compose build`
Expected: All three images build successfully.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml
git commit -m "feat: add Dockerfile and docker-compose.yml for deployment"
```

---

### Task 22: Run All Tests & Final Verification

**Files:**
- No new files

- [ ] **Step 1: Run all unit tests**

Run: `pnpm test:unit`
Expected: All unit tests pass (run-states, crypto, sanitize, cron-utils, run-state-machine)

- [ ] **Step 2: Run all integration tests**

Run: `pnpm test`
Expected: All tests pass (auth, task, run, scheduler, dispatcher, log-collector, notifier)

- [ ] **Step 3: Start dev servers and manually verify**

Run: `pnpm dev:api` and `pnpm dev:web`

Manual verification:
1. Visit `http://localhost:3001/login` — login with admin/admin123
2. Create a new task with cron `* * * * *`
3. Enable the task
4. Trigger the task manually
5. Navigate to run detail page
6. Verify SSE log stream (or check logs rendered after completion)
7. Check admin health: `curl http://localhost:3000/api/admin/health`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass"
```
