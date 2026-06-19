import type { PrismaClient } from "@prisma/client";
import { getNextRunAt } from "@agentcron/shared";
import { log } from "../../logger.js";

export class SchedulerService {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private prisma: PrismaClient) {}

  start(intervalMs: number) {
    this.timer = setInterval(() => this.tick().catch((e) => {
      log("error", "scheduler", "tick failed", { error: String(e) });
    }), intervalMs);
    log("info", "scheduler", "started", { intervalMs });
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  async tick() {
    const now = new Date();
    const dueTasks = await this.prisma.task.findMany({
      where: { status: "active", deletedAt: null, nextRunAt: { lte: now } },
    });
    let runsCreated = 0;
    for (const task of dueTasks) {
      const schedule = task.schedule as { cron: string };
      const nextRunAt = getNextRunAt(schedule.cron, now);
      await this.prisma.task.update({ where: { id: task.id }, data: { nextRunAt, lastRunAt: now } });
      if (task.concurrencyPolicy === "skip_if_running") {
        const runningCount = await this.prisma.run.count({ where: { taskId: task.id, status: "RUNNING" } });
        if (runningCount > 0) {
          log("info", "scheduler", "skipped due to running run", { taskId: task.id.toString() });
          continue;
        }
      }
      await this.prisma.run.create({
        data: { taskId: task.id, trigger: "cron", status: "PENDING", scheduledFor: now, attemptNo: 1 },
      });
      runsCreated++;
    }
    if (dueTasks.length > 0) {
      log("info", "scheduler", "tick completed", { tasksScanned: dueTasks.length, runsCreated });
    }
  }
}
