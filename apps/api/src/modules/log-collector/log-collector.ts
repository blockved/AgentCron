import type { PrismaClient } from "@prisma/client";
import type { ChildProcess } from "node:child_process";
import { sanitize, DEFAULTS } from "@agentcron/shared";
import type { LogType } from "@agentcron/shared";
import { log } from "../../logger.js";

interface LogBuffer {
  content: string;
  logType: LogType;
  byteSize: number;
}

export class LogCollector {
  private buffers = new Map<string, LogBuffer[]>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  constructor(private prisma: PrismaClient) {}

  attach(runId: bigint, child: ChildProcess) {
    const key = runId.toString();
    child.stdout?.on("data", (chunk: Buffer) => { this.append(runId, "agent_output", chunk.toString()); });
    child.stderr?.on("data", (chunk: Buffer) => { this.append(runId, "agent_error", chunk.toString()); });
    const timer = setInterval(() => {
      this.flush(runId).catch((e) => { log("error", "log-collector", "flush failed", { runId: key, error: String(e) }); });
    }, DEFAULTS.LOG_BUFFER_INTERVAL_MS);
    this.timers.set(key, timer);
  }

  append(runId: bigint, logType: LogType, content: string) {
    const key = runId.toString();
    if (!this.buffers.has(key)) this.buffers.set(key, []);
    const buffers = this.buffers.get(key)!;
    const last = buffers[buffers.length - 1];
    if (last && last.logType === logType && last.byteSize < DEFAULTS.LOG_BUFFER_MAX_BYTES) {
      last.content += content;
      last.byteSize += Buffer.byteLength(content);
    } else {
      buffers.push({ content, logType, byteSize: Buffer.byteLength(content) });
    }
    const totalBytes = buffers.reduce((sum, b) => sum + b.byteSize, 0);
    if (totalBytes >= DEFAULTS.LOG_BUFFER_MAX_BYTES) {
      this.flush(runId).catch(() => {});
    }
  }

  async flush(runId: bigint) {
    const key = runId.toString();
    const buffers = this.buffers.get(key);
    if (!buffers || buffers.length === 0) return;
    this.buffers.set(key, []);
    const timer = this.timers.get(key);
    if (timer) { clearInterval(timer); this.timers.delete(key); }
    for (const buf of buffers) {
      const sanitized = sanitize(buf.content);
      await this.prisma.taskRunLog.create({ data: { runId, logType: buf.logType, content: sanitized } });
    }
  }
}
