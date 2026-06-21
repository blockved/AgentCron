# AgentCron

AgentCron is a scheduled execution platform for coding agents. It lets a team define recurring or manual tasks, run them through Codex CLI, stream execution logs, inspect run history, and manage task state from a web UI.

## Features

- Scheduled task creation with cron expressions.
- Manual task trigger with confirmation and direct jump to live logs.
- Codex CLI execution inside the API container.
- Live run logs with terminal-style Codex output rendering.
- Run history, row-click log navigation, cancel, and ReRun support.
- Task list search and filters by status and agent type.
- MySQL-backed task queue, run state, logs, and metadata.
- Docker Compose based local deployment.

## Architecture

```text
Browser
  |
  | http://localhost:3001
  v
+-------------------+
| Next.js Web       |
| apps/web          |
+---------+---------+
          |
          | /api/* rewrite
          v
+------------------------------------------------------+
| Fastify API                                          |
| apps/api                                             |
|                                                      |
|  HTTP routes  Scheduler  Dispatcher  AgentRunner     |
|      |            |          |           |            |
|      |            |          |           v            |
|      |            |          |      Codex CLI         |
|      |            |          |      /root/.codex      |
|      |            |          |      /root/go/src      |
|      |            |          |           |            |
|      +------------+----------+------ LogCollector     |
+------------------------------------------------------+
          |
          | Prisma
          v
+-------------------+
| MySQL 8           |
| tasks/runs/logs   |
+-------------------+
```

See [docs/deployment.md](docs/deployment.md) for the full deployment architecture and configuration details.

## Repository Layout

```text
apps/api        Fastify API, scheduler, dispatcher, runner
apps/web        Next.js web UI
packages/shared Shared constants, crypto, sanitization helpers
prisma          Prisma schema and seed script
docs            Design, deployment, and knowledge docs
scripts         Local deployment helper scripts
```

## Quick Start

### 1. Create local config

```bash
cp .env.example .env
```

Generate and set stable secrets in `.env`:

```bash
openssl rand -hex 32
```

Use generated values for:

```text
MASTER_KEY=...
JWT_SECRET=...
```

`MASTER_KEY` must stay stable after tasks are created because task prompts and environments are encrypted with it.

### 2. Prepare Codex config

The default Docker Compose setup mounts local Codex config into the API container:

```bash
test -f /root/.codex/config.toml
test -f /root/.codex/auth.json
```

Task `project` paths should point to directories mounted inside the API container. By default, `/root/go/src` is mounted.

### 3. Start services

```bash
docker compose up -d --build
```

Or use the helper:

```bash
./scripts/local-deploy.sh up
```

### 4. Open the UI

```text
http://localhost:3001
```

Default seeded login:

```text
admin / admin123
```

## Common Commands

```bash
# Install dependencies
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install

# Build all packages/apps
pnpm build

# Run API and web in development
pnpm dev:api
pnpm dev:web

# Prisma
pnpm db:generate
pnpm --filter @agentcron/api exec prisma db push --schema=../../prisma/schema.prisma

# Docker status/logs
docker compose ps
docker compose logs -f --tail=200
```

## Configuration Summary

Required API environment variables:

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL connection string. |
| `MASTER_KEY` | 32-byte hex key for encrypted task fields. |
| `JWT_SECRET` | JWT signing secret. |

Common optional variables:

| Name | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | API port. |
| `DATA_DIR` | `./data` | Workspace/artifact base directory. |
| `MAX_CONCURRENT_RUNS` | shared default | Maximum concurrent agent child processes. |
| `SCHEDULER_INTERVAL_MS` | shared default | Due task scan interval. |
| `DISPATCHER_INTERVAL_MS` | shared default | Pending run claim interval. |
| `MYSQL_PORT` | `3306` | Host MySQL port in Docker Compose. |

For the complete configuration reference, see [docs/deployment.md](docs/deployment.md).

## Verification

```bash
docker compose ps
curl -I http://127.0.0.1:3001/tasks
docker compose exec -T api codex --version
docker compose exec -T api sh -lc 'test -f /root/.codex/auth.json && echo codex-auth-ok'
```

## Notes

- Do not commit `.env`, `/root/.codex/auth.json`, or other credential files.
- The default Codex adapter uses `--dangerously-bypass-approvals-and-sandbox` because the Docker runtime does not provide the namespace sandbox Codex expects.
- Only mount repositories and credentials the runner is allowed to access.
- Logs are sanitized for common token and database DSN patterns, but tasks should still avoid printing secrets.

## Documentation

- [Deployment Guide](docs/deployment.md)
- [Technical Design](docs/specs/active/2026-06-19-agentcron-design.md)
- [Project Context](docs/knowledge/project-context.md)
