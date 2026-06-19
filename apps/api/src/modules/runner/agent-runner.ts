import { spawn, type ChildProcess } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { RunStatus, DEFAULTS, decrypt } from "@agentcron/shared";
import { RunStateMachine } from "../run/run-state-machine.js";
import type { LogCollector } from "../log-collector/log-collector.js";
import type { AgentAdapter } from "./codex-adapter.js";
import { log } from "../../logger.js";
import type { AgentRunnerInterface } from "../dispatcher/dispatcher.service.js";

export class AgentRunner implements AgentRunnerInterface {
  private processes = new Map<string, ChildProcess>();
  private heartbeatTimers = new Map<string, ReturnType<typeof setInterval>>();
  private stateMachine: RunStateMachine;

  constructor(
    private prisma: PrismaClient,
    private adapter: AgentAdapter,
    private logCollector: LogCollector,
    private dataDir: string,
    private masterKey: string
  ) {
    this.stateMachine = new RunStateMachine(prisma);
  }

  async execute(runId: bigint): Promise<void> {
    const run = await this.prisma.run.findUnique({ where: { id: runId }, include: { task: true } });
    if (!run || !run.task) {
      log("error", "runner", "run or task not found", { runId: runId.toString() });
      return;
    }

    const workDir = join(this.dataDir, "workspaces", runId.toString());
    await mkdir(workDir, { recursive: true });

    const prompt = decrypt(run.task.taskPrompt, this.masterKey);
    const envStr = decrypt(run.task.environment as string, this.masterKey);
    const environment = typeof envStr === "string" ? JSON.parse(envStr) : envStr;

    const { command, args, env } = this.adapter.buildCommand({
      prompt, workDir,
      sessionId: run.sessionId || undefined,
      environment,
      permissionPolicy: run.task.permissionPolicy as Record<string, unknown>,
    });

    const child = spawn(command, args, { cwd: workDir, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    const key = runId.toString();
    this.processes.set(key, child);
    this.logCollector.attach(runId, child);

    const heartbeat = setInterval(async () => {
      try { await this.prisma.run.update({ where: { id: runId }, data: { heartbeatAt: new Date() } }); } catch {}
    }, DEFAULTS.HEARTBEAT_INTERVAL_MS);
    this.heartbeatTimers.set(key, heartbeat);

    const timeoutMs = (run.task.timeoutSeconds || DEFAULTS.TIMEOUT_SECONDS) * 1000;
    const timeoutTimer = setTimeout(() => {
      log("warn", "runner", "run timed out", { runId: key });
      child.kill("SIGTERM");
      setTimeout(() => { if (!child.killed) child.kill("SIGKILL"); }, DEFAULTS.GRACEFUL_SHUTDOWN_MS);
    }, timeoutMs);

    child.on("exit", async (code, signal) => {
      clearTimeout(timeoutTimer);
      clearInterval(heartbeat);
      this.heartbeatTimers.delete(key);
      this.processes.delete(key);
      await this.logCollector.flush(runId);

      let targetStatus: string;
      const context: Record<string, unknown> = {};
      if (signal === "SIGTERM" || signal === "SIGKILL") {
        targetStatus = RunStatus.TIMEOUT;
        context.errorMessage = `Process killed by ${signal}`;
      } else if (code === 0) {
        targetStatus = RunStatus.SUCCESS;
      } else {
        targetStatus = RunStatus.FAILED;
        context.errorMessage = `Process exited with code ${code}`;
      }
      try {
        await this.stateMachine.transition(runId, targetStatus, context);
      } catch (e) {
        log("error", "runner", "transition failed", { runId: key, error: String(e) });
      }
    });
  }

  async cancelRun(runId: bigint) {
    const key = runId.toString();
    const child = this.processes.get(key);
    if (child) {
      child.kill("SIGTERM");
      setTimeout(() => { if (!child.killed) child.kill("SIGKILL"); }, DEFAULTS.GRACEFUL_SHUTDOWN_MS);
    }
  }

  getActiveCount(): number { return this.processes.size; }
}
