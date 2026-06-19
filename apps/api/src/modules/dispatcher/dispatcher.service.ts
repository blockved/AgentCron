import type { PrismaClient } from "@prisma/client";
import { log } from "../../logger.js";

export interface AgentRunnerInterface {
  execute(runId: bigint): Promise<void>;
}

export interface DispatcherOptions {
  maxConcurrent: number;
  batchSize: number;
  workerId: string;
}

export class DispatcherService {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(
    private prisma: PrismaClient,
    private runner: AgentRunnerInterface,
    private options: DispatcherOptions
  ) {}

  start(intervalMs: number) {
    this.timer = setInterval(() => this.tick().catch((e) => {
      log("error", "dispatcher", "tick failed", { error: String(e) });
    }), intervalMs);
    log("info", "dispatcher", "started", { intervalMs });
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  async tick() {
    const runningCount = await this.prisma.run.count({
      where: { status: "RUNNING", claimedBy: this.options.workerId },
    });
    const slots = this.options.maxConcurrent - runningCount;
    if (slots <= 0) return;
    const batchSize = Math.min(slots, this.options.batchSize);

    const claimed = await this.prisma.$queryRaw<Array<{ id: bigint }>>`
      SELECT id FROM runs
      WHERE status = 'PENDING'
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;
    if (claimed.length === 0) return;

    const ids = claimed.map((r) => r.id);
    const now = new Date();
    await this.prisma.run.updateMany({
      where: { id: { in: ids } },
      data: { status: "RUNNING", claimedBy: this.options.workerId, claimedAt: now, heartbeatAt: now, startedAt: now },
    });
    log("info", "dispatcher", "claimed runs", { count: ids.length });

    for (const id of ids) {
      this.runner.execute(id).catch((e) => {
        log("error", "dispatcher", "runner execute failed", { runId: id.toString(), error: String(e) });
      });
    }
  }
}
