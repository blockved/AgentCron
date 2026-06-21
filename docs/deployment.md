# AgentCron Deployment Guide

This document covers the runtime architecture, installation steps, and configuration needed to run AgentCron.

## Architecture

```text
                         Browser
                            |
                            | HTTP :3001
                            v
                    +----------------+
                    | Next.js Web    |
                    | apps/web       |
                    +-------+--------+
                            |
                            | /api/* rewrite
                            | http://api:3000
                            v
+--------------------------------------------------------------------+
|                         Fastify API (:3000)                         |
|                         apps/api                                    |
|                                                                    |
|  +-------------+   +-------------+   +--------------------------+   |
|  | HTTP Routes |   | Scheduler   |   | Dispatcher               |   |
|  | auth/tasks  |   | due tasks   |   | claim pending runs       |   |
|  | runs/admin  |   +------+------+   +------------+-------------+   |
|  +------+------+          |                       |                 |
|         |                 |                       v                 |
|         |                 |              +------------------+       |
|         |                 |              | AgentRunner      |       |
|         |                 |              | spawn codex CLI  |       |
|         |                 |              +----+-------------+       |
|         |                 |                   |                     |
|         |                 |                   | cwd = task.project  |
|         |                 |                   v                     |
|         |                 |          +------------------+            |
|         |                 |          | Codex CLI        |            |
|         |                 |          | /root/.codex    |            |
|         |                 |          | /root/go/src    |            |
|         |                 |          +--------+---------+            |
|         |                 |                   | stdout/stderr       |
|         |                 |                   v                     |
|         |                 |          +------------------+            |
|         +-----------------+--------->| LogCollector     |            |
|                                      | DB logs + SSE    |            |
|                                      +------------------+            |
+--------------------------------------------------------------------+
                            |
                            | Prisma
                            v
                    +----------------+
                    | MySQL 8        |
                    | tasks/runs/logs|
                    +----------------+

Persistent volumes:
  mysql-data      -> MySQL data
  agentcron-data  -> run workspace/artifact data

Host mounts used by the default compose file:
  /root/.codex    -> Codex config/auth inside API container
  /root/go/src    -> project source roots available to Codex
```

## Prerequisites

- Docker and Docker Compose v2.
- Node.js 20+ and pnpm 10.12.1 if running without Docker.
- A valid local Codex configuration under `/root/.codex` when using the default Docker Compose setup.
- Any repositories referenced by task `project` paths must exist on the host and be mounted into the API container. The default compose file mounts `/root/go/src`.

## Quick Start With Docker Compose

1. Create a local environment file:

```bash
cp .env.example .env
```

2. Replace placeholder secrets in `.env`:

```bash
MASTER_KEY="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 32)"
```

Update `.env` with those generated values. `MASTER_KEY` must remain stable after tasks are created because it is used to decrypt task prompts and environments.

3. Make sure Codex configuration is available on the host:

```bash
test -f /root/.codex/config.toml
test -f /root/.codex/auth.json
```

4. Start services:

```bash
docker compose up -d --build
```

5. Verify services:

```bash
docker compose ps
curl -I http://127.0.0.1:3001/tasks
docker compose exec -T api codex --version
```

6. Open the web UI:

```text
http://127.0.0.1:3001
```

Default seeded login:

```text
username: admin
password: admin123
```

## Local Helper Script

The repository includes a helper for local Docker deployment:

```bash
./scripts/local-deploy.sh up
./scripts/local-deploy.sh status
./scripts/local-deploy.sh logs
./scripts/local-deploy.sh down
```

The script creates `.env` when missing, chooses a MySQL host port, and generates local secrets when placeholders are detected.

## Manual Development Setup

1. Install dependencies:

```bash
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install
```

2. Start MySQL 8 and set `DATABASE_URL` in `.env`.

3. Generate Prisma client and sync schema:

```bash
pnpm db:generate
pnpm --filter @agentcron/api exec prisma db push --schema=../../prisma/schema.prisma
```

4. Seed the admin user:

```bash
node prisma/seed.mjs
```

5. Start API and Web in separate shells:

```bash
pnpm dev:api
pnpm dev:web
```

Local URLs:

```text
API: http://127.0.0.1:3000
Web: http://127.0.0.1:3001
```

## Configuration

### API Environment Variables

| Name | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | none | MySQL connection string for Prisma. |
| `MASTER_KEY` | yes | none | 32-byte hex key used for encrypted task prompts/environments. Keep stable. |
| `JWT_SECRET` | yes | none | JWT signing secret for web/API auth. |
| `DATA_DIR` | no | `./data` | Base directory for generated workspaces/artifacts. Docker uses `/data`. |
| `PORT` | no | `3000` | API listen port. |
| `MAX_CONCURRENT_RUNS` | no | shared default | Maximum active child processes per API worker. |
| `SCHEDULER_INTERVAL_MS` | no | shared default | Scheduler tick interval for creating due runs. |
| `DISPATCHER_INTERVAL_MS` | no | shared default | Dispatcher tick interval for claiming pending runs. |

### Docker Compose Variables

| Name | Default | Purpose |
| --- | --- | --- |
| `MYSQL_ROOT_PASSWORD` | `password` | Root password for the bundled MySQL container. |
| `MYSQL_PORT` | `3306` | Host port mapped to MySQL container port `3306`. |
| `MASTER_KEY` | none | Passed to API. |
| `JWT_SECRET` | none | Passed to API. |

### Web Configuration

`apps/web/next.config.ts` rewrites `/api/*` to `API_INTERNAL_URL`.

In Docker Compose:

```text
API_INTERNAL_URL=http://api:3000
```

For local development outside Docker, use the default:

```text
API_INTERNAL_URL=http://localhost:3000
```

### Codex Configuration

The API container runs `codex` for task execution. The default image installs Codex CLI and the compose file mounts:

```yaml
volumes:
  - /root/.codex:/root/.codex
  - /root/go/src:/root/go/src
```

Check inside the container:

```bash
docker compose exec -T api sh -lc 'codex --version && test -f /root/.codex/auth.json && echo OK'
```

Task `project` paths should point to mounted paths that exist in the API container, for example:

```text
/root/go/src/ipfs-proxy
```

If `project` is empty, AgentCron creates a per-run workspace under `DATA_DIR/workspaces/<runId>`.

## Database Initialization

The Docker Compose command performs schema sync on startup:

```bash
pnpm exec prisma db push --schema=../../prisma/schema.prisma
```

Then it runs:

```bash
node seed.mjs
```

This creates or preserves the default admin user.

For production, replace the default admin password immediately or seed a different admin account.

## Operational Checks

### Service Status

```bash
docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=100 web
```

### API Health

```bash
curl -I http://127.0.0.1:3000/api/admin/health
```

The health endpoint is public. Other admin endpoints require authentication.

### Login Token

```bash
curl -sS -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

### Run Logs

```bash
curl -N http://127.0.0.1:3001/api/runs/<runId>/logs/stream \
  -H "Authorization: Bearer <token>"
```

## Common Issues

### `spawn codex ENOENT`

Codex CLI is not installed or not in `PATH` inside the API container.

Check:

```bash
docker compose exec -T api codex --version
```

### Codex Network Or TLS Errors

Ensure the API image has CA certificates and outbound network access:

```bash
docker compose exec -T api sh -lc 'openssl version && codex doctor'
```

### Task Project Path Not Found

The task `project` path must exist inside the API container. Mount the host directory in `docker-compose.yml`, then recreate the API container.

### Logs Show Raw JSON

Codex runs with `--json`. The web log viewer parses Codex JSONL events into terminal-style output. If a line cannot be parsed, it is displayed as raw fallback text.

### MySQL Port Conflict

Set `MYSQL_PORT` in `.env`, for example:

```text
MYSQL_PORT=3307
```

Then restart:

```bash
docker compose up -d
```

## Security Notes

- Do not commit `.env`, `/root/.codex/auth.json`, or other credential files.
- Treat `MASTER_KEY` as durable secret material. Losing it makes encrypted task prompts/environments unreadable.
- The current Codex adapter uses `--dangerously-bypass-approvals-and-sandbox` because Docker namespace sandboxing is not available in the default container environment. Only mount repositories and credentials the runner is allowed to access.
- Logs are sanitized for common token and database DSN patterns, but tasks should still avoid printing secrets.
