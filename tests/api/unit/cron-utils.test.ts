import { describe, it, expect } from "vitest";
import { getNextRunAt, isValidCron } from "@agentcron/shared";

describe("cron-utils", () => {
  it("validates correct cron expressions", () => {
    expect(isValidCron("*/5 * * * *")).toBe(true);
    expect(isValidCron("0 9 * * 1-5")).toBe(true);
    expect(isValidCron("30 2 * * *")).toBe(true);
  });

  it("rejects invalid cron expressions", () => {
    expect(isValidCron("not a cron")).toBe(false);
    expect(isValidCron("")).toBe(false);
    expect(isValidCron("60 * * * *")).toBe(false);
  });

  it("calculates next run time after a given date", () => {
    const base = new Date("2026-06-19T10:00:00Z");
    const next = getNextRunAt("0 11 * * *", base);
    expect(next).not.toBeNull();
    expect(next!.getUTCHours()).toBe(11);
    expect(next!.getUTCMinutes()).toBe(0);
  });

  it("wraps to next day if today's slot passed", () => {
    const base = new Date("2026-06-19T12:00:00Z");
    const next = getNextRunAt("0 11 * * *", base);
    expect(next!.getUTCDate()).toBe(20);
  });

  it("returns null for invalid cron", () => {
    const next = getNextRunAt("invalid", new Date());
    expect(next).toBeNull();
  });
});
