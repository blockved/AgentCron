import type { FastifyInstance } from "fastify";
import { createTaskSchema, updateTaskSchema, listTasksSchema } from "./task.schema.js";
import { TaskService } from "./task.service.js";

export default async function taskRoutes(app: FastifyInstance) {
  const taskService = new TaskService(app.prisma, app.config.masterKey);
  app.addHook("onRequest", app.authenticate);

  app.post("/", async (request) => {
    const input = createTaskSchema.parse(request.body);
    const task = await taskService.create(input, request.currentUser);
    return { code: 0, data: taskService.serialize(task), message: "ok", traceId: request.traceId };
  });

  app.get("/", async (request) => {
    const query = listTasksSchema.parse(request.query);
    const userId = request.currentUser.role === "admin" ? undefined : BigInt(request.currentUser.userId as unknown as string);
    const data = await taskService.list(query.page, query.pageSize, query.status, userId);
    return { code: 0, data, message: "ok", traceId: request.traceId };
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await taskService.getById(BigInt(id));
    if (!task) return reply.status(404).send({ code: 40400, data: null, message: "Task not found", traceId: request.traceId });
    return { code: 0, data: taskService.serialize(task), message: "ok", traceId: request.traceId };
  });

  app.patch("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const input = updateTaskSchema.parse(request.body);
    const userId = request.currentUser.role === "admin" ? undefined : BigInt(request.currentUser.userId as unknown as string);
    const task = await taskService.update(BigInt(id), input, userId);
    return { code: 0, data: taskService.serialize(task), message: "ok", traceId: request.traceId };
  });

  app.delete("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const userId = request.currentUser.role === "admin" ? undefined : BigInt(request.currentUser.userId as unknown as string);
    await taskService.softDelete(BigInt(id), userId);
    return { code: 0, data: null, message: "ok", traceId: request.traceId };
  });

  app.post("/:id\\:enable", async (request) => {
    const { id } = request.params as { id: string };
    const userId = request.currentUser.role === "admin" ? undefined : BigInt(request.currentUser.userId as unknown as string);
    const task = await taskService.enable(BigInt(id), userId);
    return { code: 0, data: taskService.serialize(task), message: "ok", traceId: request.traceId };
  });

  app.post("/:id\\:disable", async (request) => {
    const { id } = request.params as { id: string };
    const userId = request.currentUser.role === "admin" ? undefined : BigInt(request.currentUser.userId as unknown as string);
    const task = await taskService.disable(BigInt(id), userId);
    return { code: 0, data: taskService.serialize(task), message: "ok", traceId: request.traceId };
  });

  app.post("/:id\\:trigger", async (request) => {
    const { id } = request.params as { id: string };
    const task = await taskService.getById(BigInt(id));
    if (!task) throw Object.assign(new Error("Task not found"), { statusCode: 404 });
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
    return { code: 0, data: { ...run, id: run.id.toString(), taskId: run.taskId.toString() }, message: "ok", traceId: request.traceId };
  });
}
