import { z } from "zod";

export const createTaskSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  agentType: z.string().min(1).max(64),
  project: z.string().max(255).optional(),
  taskPrompt: z.string().min(1),
  schedule: z.object({
    cron: z.string(),
    timezone: z.string().optional(),
  }),
  sessionPolicy: z.enum(["always_new", "reuse_fixed", "reuse_last_success"]),
  concurrencyPolicy: z.enum(["skip_if_running", "queue_if_running", "allow_parallel"]).default("skip_if_running"),
  environment: z.record(z.unknown()).default({}),
  permissionPolicy: z.record(z.unknown()).default({}),
  notificationConfig: z.object({
    enabled: z.boolean(),
    channels: z.array(z.object({
      type: z.enum(["webhook", "feishu"]),
      url: z.string().url(),
      secret: z.string().optional(),
    })),
    onStatuses: z.array(z.string()),
  }),
  timeoutSeconds: z.number().int().min(60).max(86400).default(3600),
  maxRetries: z.number().int().min(0).max(10).default(0),
});

export const updateTaskSchema = createTaskSchema.partial();

export const listTasksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["active", "paused"]).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
