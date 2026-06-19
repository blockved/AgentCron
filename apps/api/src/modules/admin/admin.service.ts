import type { PrismaClient } from "@prisma/client";
import { RunStatus } from "@agentcron/shared";

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  async health() {
    try { await this.prisma.$queryRaw`SELECT 1`; return { status: "ok", db: "connected" }; }
    catch { return { status: "degraded", db: "disconnected" }; }
  }

  async metrics() {
    const [running, pending, successLast24h, failedLast24h, totalTasks] = await Promise.all([
      this.prisma.run.count({ where: { status: RunStatus.RUNNING } }),
      this.prisma.run.count({ where: { status: RunStatus.PENDING } }),
      this.prisma.run.count({ where: { status: RunStatus.SUCCESS, finishedAt: { gte: new Date(Date.now() - 86400000) } } }),
      this.prisma.run.count({ where: { status: RunStatus.FAILED, finishedAt: { gte: new Date(Date.now() - 86400000) } } }),
      this.prisma.task.count({ where: { deletedAt: null } }),
    ]);
    const total24h = successLast24h + failedLast24h;
    const successRate = total24h > 0 ? ((successLast24h / total24h) * 100).toFixed(1) : "N/A";
    return { activeRuns: running, pendingRuns: pending, successRate24h: successRate, totalTasks };
  }

  async queue() {
    const [pendingRuns, runningRuns] = await Promise.all([
      this.prisma.run.findMany({ where: { status: RunStatus.PENDING }, select: { id: true, taskId: true, scheduledFor: true, attemptNo: true, createdAt: true }, orderBy: { scheduledFor: "asc" }, take: 50 }),
      this.prisma.run.findMany({ where: { status: RunStatus.RUNNING }, select: { id: true, taskId: true, claimedBy: true, startedAt: true, heartbeatAt: true }, orderBy: { startedAt: "asc" }, take: 50 }),
    ]);
    return {
      pending: pendingRuns.map((r) => ({ ...r, id: r.id.toString(), taskId: r.taskId.toString() })),
      running: runningRuns.map((r) => ({ ...r, id: r.id.toString(), taskId: r.taskId.toString() })),
    };
  }

  async recoverStaleRuns(thresholdSeconds: number) {
    const threshold = new Date(Date.now() - thresholdSeconds * 1000);
    const staleRuns = await this.prisma.run.findMany({
      where: { status: RunStatus.RUNNING, heartbeatAt: { lt: threshold } },
      include: { task: { select: { maxRetries: true } } },
    });
    for (const run of staleRuns) {
      await this.prisma.run.update({
        where: { id: run.id },
        data: { status: RunStatus.SYSTEM_ERROR, finishedAt: new Date(), errorMessage: "Recovered after heartbeat timeout", duration: run.startedAt ? Math.floor((Date.now() - run.startedAt.getTime()) / 1000) : null },
      });
      await this.prisma.taskRunLog.create({ data: { runId: run.id, logType: "system", content: "State transition: RUNNING → SYSTEM_ERROR (heartbeat timeout recovery)" } });
      if (run.attemptNo < (run.task?.maxRetries || 0)) {
        const backoffS = 30 * Math.pow(4, run.attemptNo - 1);
        await this.prisma.run.create({ data: { taskId: run.taskId, trigger: "retry", status: RunStatus.PENDING, scheduledFor: new Date(Date.now() + backoffS * 1000), attemptNo: run.attemptNo + 1 } });
      }
    }
    return staleRuns.length;
  }
}
