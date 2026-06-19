import { log } from "../../logger.js";

export async function sendFeishu(webhookUrl: string, payload: Record<string, unknown>): Promise<boolean> {
  const card = {
    msg_type: "interactive",
    card: {
      header: {
        title: { tag: "plain_text", content: `AgentCron: ${payload.taskName} - ${payload.status}` },
        template: payload.status === "SUCCESS" ? "green" : "red",
      },
      elements: [
        {
          tag: "div",
          fields: [
            { is_short: true, text: { tag: "lark_md", content: `**Task:** ${payload.taskName}` } },
            { is_short: true, text: { tag: "lark_md", content: `**Status:** ${payload.status}` } },
            { is_short: true, text: { tag: "lark_md", content: `**Duration:** ${payload.duration}s` } },
            { is_short: true, text: { tag: "lark_md", content: `**Run ID:** ${payload.runId}` } },
          ],
        },
        ...(payload.errorMessage ? [{ tag: "div", text: { tag: "lark_md", content: `**Error:** ${payload.errorMessage}` } }] : []),
        { tag: "action", actions: [{ tag: "button", text: { tag: "plain_text", content: "View Run" }, url: payload.runUrl, type: "primary" }] },
      ],
    },
  };
  try {
    const res = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(card), signal: AbortSignal.timeout(10000) });
    return res.ok;
  } catch (e) {
    log("error", "feishu", "send failed", { error: String(e) });
    return false;
  }
}
