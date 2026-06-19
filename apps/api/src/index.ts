import Fastify from "fastify";
import cors from "@fastify/cors";
import { loadConfig } from "./config.js";
import prismaPlugin from "./plugins/prisma.js";
import traceIdPlugin from "./plugins/trace-id.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import authPlugin from "./plugins/auth.js";
import { log } from "./logger.js";
import authRoutes from "./modules/auth/auth.routes.js";
import taskRoutes from "./modules/task/task.routes.js";

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
