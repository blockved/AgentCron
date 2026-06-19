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
  const runner = new AgentRunner(app.prisma, adapter, logCollector, config.dataDir, config.masterKey);

  const workerId = `worker-${hostname()}-${process.pid}`;
  const dispatcher = new DispatcherService(app.prisma, runner, {
    maxConcurrent: config.maxConcurrentRuns,
    batchSize: config.dispatcherBatchSize,
    workerId,
  });

  const scheduler = new SchedulerService(app.prisma);
  const adminService = new AdminService(app.prisma);

  const recovered = await adminService.recoverStaleRuns(DEFAULTS.HEARTBEAT_RECOVERY_THRESHOLD_S);
  if (recovered > 0) log("info", "startup", "recovered stale runs", { count: recovered });

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
