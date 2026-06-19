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
    return this.prisma.task.findFirst({ where: { id, deletedAt: null } });
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
    const task = await this.prisma.task.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw Object.assign(new Error("Task not found"), { statusCode: 404 });
    if (userId && task.ownerId !== userId) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    return task;
  }
}
