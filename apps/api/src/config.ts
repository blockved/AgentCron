import { DEFAULTS } from "@agentcron/shared";

export interface AppConfig {
  port: number;
  databaseUrl: string;
  masterKey: string;
  jwtSecret: string;
  dataDir: string;
  maxConcurrentRuns: number;
  schedulerIntervalMs: number;
  dispatcherIntervalMs: number;
  dispatcherBatchSize: number;
}

export function loadConfig(): AppConfig {
  const required = (name: string): string => {
    const val = process.env[name];
    if (!val) throw new Error(`Missing required env var: ${name}`);
    return val;
  };

  return {
    port: parseInt(process.env.PORT || "3000", 10),
    databaseUrl: required("DATABASE_URL"),
    masterKey: required("MASTER_KEY"),
    jwtSecret: required("JWT_SECRET"),
    dataDir: process.env.DATA_DIR || "./data",
    maxConcurrentRuns: parseInt(
      process.env.MAX_CONCURRENT_RUNS || String(DEFAULTS.MAX_CONCURRENT_RUNS),
      10
    ),
    schedulerIntervalMs: parseInt(
      process.env.SCHEDULER_INTERVAL_MS || String(DEFAULTS.SCHEDULER_INTERVAL_MS),
      10
    ),
    dispatcherIntervalMs: parseInt(
      process.env.DISPATCHER_INTERVAL_MS || String(DEFAULTS.DISPATCHER_INTERVAL_MS),
      10
    ),
    dispatcherBatchSize: DEFAULTS.DISPATCHER_BATCH_SIZE,
  };
}
