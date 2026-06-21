import type { FastifyInstance } from "fastify";
import { listRunsSchema, listLogsSchema } from "./run.schema.js";
import { RunService } from "./run.service.js";
import { isTerminal } from "@agentcron/shared";

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
    if (!data) return reply.status(404).send({ code: 40400, data: null, message: "Run not found", traceId: request.traceId });
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
        const run = await app.prisma.run.findUnique({ where: { id: runId }, select: { status: true } });
        const logs = await app.prisma.taskRunLog.findMany({
          where: { runId, id: { gt: lastLogId } },
          orderBy: { id: "asc" },
          take: 50,
        });
        for (const log of logs) {
          const data = JSON.stringify({ id: log.id.toString(), logType: log.logType, content: log.content, metadata: log.metadata, createdAt: log.createdAt });
          reply.raw.write(`data: ${data}\n\n`);
          lastLogId = log.id;
        }
        if (run && isTerminal(run.status)) {
          reply.raw.write(`event: done\ndata: ${JSON.stringify({ status: run.status })}\n\n`);
          clearInterval(interval);
          reply.raw.end();
        }
      } catch {
        clearInterval(interval);
        reply.raw.end();
      }
    }, 1000);

    request.raw.on("close", () => { clearInterval(interval); });
  });

  app.post("/:id/cancel", async (request) => {
    const { id } = request.params as { id: string };
    const run = await runService.cancel(BigInt(id));
    return { code: 0, data: { ...run, id: run.id.toString(), taskId: run.taskId.toString() }, message: "ok", traceId: request.traceId };
  });

  app.post("/:id/rerun", async (request) => {
    const { id } = request.params as { id: string };
    const userId = BigInt(request.currentUser.userId as unknown as string);
    const data = await runService.rerun(BigInt(id), userId);
    return { code: 0, data, message: "ok", traceId: request.traceId };
  });

  app.get("/:id/artifacts/:aid", async (request, reply) => {
    const { id, aid } = request.params as { id: string; aid: string };
    const artifact = await app.prisma.taskRunArtifact.findFirst({ where: { id: BigInt(aid), runId: BigInt(id) } });
    if (!artifact || !artifact.storagePath) return reply.status(404).send({ code: 40400, data: null, message: "Artifact not found", traceId: request.traceId });
    const { createReadStream } = await import("node:fs");
    const stream = createReadStream(artifact.storagePath);
    reply.header("Content-Disposition", `attachment; filename="${artifact.name}"`);
    return reply.send(stream);
  });
}
