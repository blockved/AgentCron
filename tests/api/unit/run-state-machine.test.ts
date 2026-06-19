import { describe, it, expect, vi, beforeEach } from "vitest";
import { RunStateMachine } from "../../../apps/api/src/modules/run/run-state-machine.js";
import { RunStatus } from "@agentcron/shared";

const mockPrisma = {
  run: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  taskRunLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
} as any;

describe("RunStateMachine", () => {
  let sm: RunStateMachine;

  beforeEach(() => {
    vi.clearAllMocks();
    sm = new RunStateMachine(mockPrisma);
  });

  it("transitions PENDING → RUNNING", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      return fn(mockPrisma);
    });
    mockPrisma.run.findUnique.mockResolvedValue({
      id: 1n,
      status: RunStatus.PENDING,
    });
    mockPrisma.run.update.mockResolvedValue({
      id: 1n,
      status: RunStatus.RUNNING,
    });

    const result = await sm.transition(1n, RunStatus.RUNNING, {});
    expect(result.status).toBe(RunStatus.RUNNING);
    expect(mockPrisma.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ status: RunStatus.RUNNING }),
      })
    );
  });

  it("rejects invalid transition PENDING → SUCCESS", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      return fn(mockPrisma);
    });
    mockPrisma.run.findUnique.mockResolvedValue({
      id: 1n,
      status: RunStatus.PENDING,
    });

    await expect(sm.transition(1n, RunStatus.SUCCESS, {})).rejects.toThrow(
      "Invalid transition"
    );
  });

  it("rejects transition from terminal state", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      return fn(mockPrisma);
    });
    mockPrisma.run.findUnique.mockResolvedValue({
      id: 1n,
      status: RunStatus.SUCCESS,
    });

    await expect(sm.transition(1n, RunStatus.RUNNING, {})).rejects.toThrow(
      "Invalid transition"
    );
  });

  it("sets finishedAt and duration for terminal states", async () => {
    const startedAt = new Date("2026-06-19T10:00:00Z");
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      return fn(mockPrisma);
    });
    mockPrisma.run.findUnique.mockResolvedValue({
      id: 1n,
      status: RunStatus.RUNNING,
      startedAt,
    });
    mockPrisma.run.update.mockResolvedValue({
      id: 1n,
      status: RunStatus.SUCCESS,
    });

    await sm.transition(1n, RunStatus.SUCCESS, {});

    expect(mockPrisma.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: RunStatus.SUCCESS,
          finishedAt: expect.any(Date),
          duration: expect.any(Number),
        }),
      })
    );
  });

  it("logs state transition as system event", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      return fn(mockPrisma);
    });
    mockPrisma.run.findUnique.mockResolvedValue({
      id: 1n,
      status: RunStatus.PENDING,
    });
    mockPrisma.run.update.mockResolvedValue({
      id: 1n,
      status: RunStatus.RUNNING,
    });

    await sm.transition(1n, RunStatus.RUNNING, {});

    expect(mockPrisma.taskRunLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          runId: 1n,
          logType: "system",
        }),
      })
    );
  });
});
