export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
  traceId: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type TaskStatus = "active" | "paused" | "deleted";

export type TriggerType = "cron" | "manual" | "retry";

export type SessionPolicy = "always_new" | "reuse_fixed" | "reuse_last_success";

export type ConcurrencyPolicy =
  | "skip_if_running"
  | "queue_if_running"
  | "allow_parallel";

export type LogType =
  | "agent_output"
  | "agent_error"
  | "tool_call"
  | "system"
  | "heartbeat";

export type UserRole = "admin" | "member";

export interface ScheduleConfig {
  cron: string;
  timezone?: string;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  onStatuses: string[];
}

export interface NotificationChannel {
  type: "webhook" | "feishu";
  url: string;
  secret?: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
}
