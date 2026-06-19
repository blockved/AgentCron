export function log(
  level: "info" | "warn" | "error" | "debug",
  module: string,
  msg: string,
  extra: Record<string, unknown> = {},
  traceId?: string
): void {
  const ts = new Date().toISOString();
  const kvPairs = Object.entries(extra)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(" ");
  const traceStr = traceId ? ` traceId=${traceId}` : "";
  console.log(
    `ts=${ts} level=${level} module=${module}${traceStr} msg=${JSON.stringify(msg)} ${kvPairs}`.trim()
  );
}
