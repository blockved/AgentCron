import { log } from "../../logger.js";

export async function sendWebhook(url: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch (e) {
    log("error", "webhook", "send failed", { url, error: String(e) });
    return false;
  }
}
