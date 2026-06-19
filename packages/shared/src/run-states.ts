export const RunStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  TIMEOUT: "TIMEOUT",
  CANCELLED: "CANCELLED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  PARTIAL_SUCCESS: "PARTIAL_SUCCESS",
  NO_ACTION: "NO_ACTION",
  SYSTEM_ERROR: "SYSTEM_ERROR",
  SKIPPED: "SKIPPED",
} as const;

export type RunStatusType = (typeof RunStatus)[keyof typeof RunStatus];

export const TERMINAL_STATES: ReadonlySet<string> = new Set([
  RunStatus.SUCCESS,
  RunStatus.FAILED,
  RunStatus.TIMEOUT,
  RunStatus.CANCELLED,
  RunStatus.NEEDS_REVIEW,
  RunStatus.PARTIAL_SUCCESS,
  RunStatus.NO_ACTION,
  RunStatus.SYSTEM_ERROR,
  RunStatus.SKIPPED,
]);

export const VALID_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  [RunStatus.PENDING]: new Set([
    RunStatus.RUNNING,
    RunStatus.CANCELLED,
    RunStatus.SKIPPED,
  ]),
  [RunStatus.RUNNING]: new Set([
    RunStatus.SUCCESS,
    RunStatus.FAILED,
    RunStatus.TIMEOUT,
    RunStatus.CANCELLED,
    RunStatus.NEEDS_REVIEW,
    RunStatus.PARTIAL_SUCCESS,
    RunStatus.NO_ACTION,
    RunStatus.SYSTEM_ERROR,
  ]),
};

export function isTerminal(status: string): boolean {
  return TERMINAL_STATES.has(status);
}

export function canTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.has(to) : false;
}
