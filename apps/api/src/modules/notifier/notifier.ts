import type { NotificationConfig } from "@agentcron/shared";
import { sendWebhook } from "./webhook-channel.js";
import { sendFeishu } from "./feishu-channel.js";
import { log } from "../../logger.js";

export interface NotificationPayload {
  taskName: string;
  runId: string;
  status: string;
  duration: number;
  errorMessage: string | null;
  resultSummary: string | null;
  runUrl: string;
  triggeredAt: string;
}

export class Notifier {
  async send(config: NotificationConfig, payload: NotificationPayload): Promise<void> {
    if (!config.enabled) return;
    if (!config.onStatuses.includes(payload.status)) return;
    for (const channel of config.channels) {
      let success = false;
      if (channel.type === "webhook") success = await sendWebhook(channel.url, payload);
      else if (channel.type === "feishu") success = await sendFeishu(channel.url, payload);
      if (!success) log("warn", "notifier", "notification failed", { type: channel.type, runId: payload.runId });
    }
  }
}
