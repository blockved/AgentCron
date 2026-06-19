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
      this.prisma.run.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.run.count({ where }),
    ]);
    return { items: items.map((r) => this.serialize(r)), total, page, pageSize };
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
      this.prisma.taskRunLog.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "asc" } }),
      this.prisma.taskRunLog.count({ where }),
    ]);
    return { items: items.map((l) => ({ ...l, id: l.id.toString(), runId: l.runId.toString() })), total, page, pageSize };
  }

  private serialize(run: any) {
    return { ...run, id: run.id.toString(), taskId: run.taskId.toString(), triggeredById: run.triggeredById?.toString() ?? null };
  }
}
