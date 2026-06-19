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
