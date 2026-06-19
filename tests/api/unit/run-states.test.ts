import { describe, it, expect } from "vitest";
import {
  RunStatus,
  TERMINAL_STATES,
  VALID_TRANSITIONS,
  isTerminal,
  canTransition,
} from "@agentcron/shared";

describe("RunStatus", () => {
  it("defines all 11 states", () => {
    expect(Object.keys(RunStatus)).toHaveLength(11);
  });

  it("marks terminal states correctly", () => {
    expect(isTerminal(RunStatus.SUCCESS)).toBe(true);
    expect(isTerminal(RunStatus.FAILED)).toBe(true);
    expect(isTerminal(RunStatus.TIMEOUT)).toBe(true);
    expect(isTerminal(RunStatus.CANCELLED)).toBe(true);
    expect(isTerminal(RunStatus.NEEDS_REVIEW)).toBe(true);
    expect(isTerminal(RunStatus.PARTIAL_SUCCESS)).toBe(true);
    expect(isTerminal(RunStatus.NO_ACTION)).toBe(true);
    expect(isTerminal(RunStatus.SYSTEM_ERROR)).toBe(true);
    expect(isTerminal(RunStatus.SKIPPED)).toBe(true);
    expect(isTerminal(RunStatus.PENDING)).toBe(false);
    expect(isTerminal(RunStatus.RUNNING)).toBe(false);
  });

  it("allows PENDING → RUNNING", () => {
    expect(canTransition(RunStatus.PENDING, RunStatus.RUNNING)).toBe(true);
  });

  it("allows PENDING → CANCELLED", () => {
    expect(canTransition(RunStatus.PENDING, RunStatus.CANCELLED)).toBe(true);
  });

  it("allows PENDING → SKIPPED", () => {
    expect(canTransition(RunStatus.PENDING, RunStatus.SKIPPED)).toBe(true);
  });

  it("allows RUNNING → all terminal states except SKIPPED", () => {
    const fromRunning = [
      RunStatus.SUCCESS,
      RunStatus.FAILED,
      RunStatus.TIMEOUT,
      RunStatus.CANCELLED,
      RunStatus.NEEDS_REVIEW,
      RunStatus.PARTIAL_SUCCESS,
      RunStatus.NO_ACTION,
      RunStatus.SYSTEM_ERROR,
    ];
    for (const target of fromRunning) {
      expect(canTransition(RunStatus.RUNNING, target)).toBe(true);
    }
  });

  it("rejects transitions from terminal states", () => {
    expect(canTransition(RunStatus.SUCCESS, RunStatus.RUNNING)).toBe(false);
    expect(canTransition(RunStatus.FAILED, RunStatus.PENDING)).toBe(false);
  });

  it("rejects PENDING → SUCCESS (must go through RUNNING)", () => {
    expect(canTransition(RunStatus.PENDING, RunStatus.SUCCESS)).toBe(false);
  });
});
