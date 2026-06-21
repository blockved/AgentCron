"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/lib/use-sse";

type RenderedLog =
  | { key: string; kind: "line"; tone: string; prefix: string; content: string }
  | {
      key: string;
      kind: "command";
      command: string;
      output: string;
      status: string;
      exitCode: number | null;
    };

interface LogViewerProps {
  logs: LogEntry[];
  done: boolean;
}

function parseJsonLines(content: string) {
  const events: any[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }
  return events.length > 0 ? events : null;
}

function renderCodexEvent(log: LogEntry, event: any, index: number): RenderedLog | null {
  const item = event?.item;
  const key = `${log.id}-${index}`;

  if (event?.type === "turn.started") {
    return { key, kind: "line", tone: "text-slate-500", prefix: "$", content: "codex" };
  }

  if (!item) return null;

  if (item.type === "agent_message" && item.text) {
    return {
      key,
      kind: "line",
      tone: "text-slate-100",
      prefix: ">",
      content: item.text,
    };
  }

  if (item.type === "command_execution") {
    const output = String(item.aggregated_output || "").trimEnd();
    return {
      key,
      kind: "command",
      command: item.command || "command",
      output,
      status: item.status || "started",
      exitCode: item.exit_code ?? null,
    };
  }

  if (item.type === "todo_list" && Array.isArray(item.items)) {
    return {
      key,
      kind: "line",
      tone: "text-slate-300",
      prefix: "#",
      content: item.items
        .map((todo: any) => `${todo.completed ? "[x]" : "[ ]"} ${todo.text}`)
        .join("\n"),
    };
  }

  return null;
}

function renderLog(log: LogEntry): RenderedLog[] {
  const content = log.content || "";
  const codexEvents = log.logType === "agent_output" ? parseJsonLines(content) : null;

  if (codexEvents) {
    return codexEvents
      .map((event, index) => renderCodexEvent(log, event, index))
      .filter((entry): entry is RenderedLog => Boolean(entry));
  }

  if (log.logType === "agent_error" && content.trim() === "Reading additional input from stdin...") {
    return [];
  }

  const toneByType: Record<string, string> = {
    agent_output: "text-slate-200",
    agent_error: "text-red-300",
    system: "text-sky-300",
    tool_call: "text-amber-300",
    heartbeat: "text-slate-500",
  };

  return [
    {
      key: log.id,
      kind: "line",
      tone: toneByType[log.logType] || "text-slate-200",
      prefix: log.logType === "system" ? "#" : "!",
      content,
    },
  ];
}

function countRenderedLogs(logs: LogEntry[]) {
  return logs.reduce((sum, log) => sum + renderLog(log).length, 0);
}

export function LogViewer({ logs, done }: LogViewerProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const renderedLogs = logs.flatMap(renderLog);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">Codex terminal</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {countRenderedLogs(logs)} terminal entries
          </p>
        </div>
        <span
          className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${
            done
              ? "border-emerald-800 bg-emerald-950 text-emerald-300"
              : "border-sky-800 bg-sky-950 text-sky-300"
          }`}
        >
          {done ? "Complete" : "Live"}
        </span>
      </div>
      <div className="max-h-[600px] overflow-y-auto p-4 font-mono text-sm">
      {renderedLogs.length === 0 && !done && (
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-slate-400">
          Waiting for logs...
        </div>
      )}
      {renderedLogs.length === 0 && done && (
        <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-slate-400">
          No logs were recorded for this run.
        </div>
      )}
      {renderedLogs.map((entry) =>
        entry.kind === "command" ? (
          <div key={entry.key} className="border-b border-slate-900 py-3 last:border-0">
            <div className="flex items-start gap-2 text-emerald-300">
              <span className="select-none text-slate-500">$</span>
              <span className="break-all">{entry.command}</span>
            </div>
            {entry.output && (
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-900/70 p-3 text-slate-200">
                {entry.output}
              </pre>
            )}
            <div
              className={`mt-2 text-xs ${
                entry.status === "failed" || (entry.exitCode ?? 0) > 0
                  ? "text-red-300"
                  : entry.status === "in_progress"
                    ? "text-sky-300"
                    : "text-slate-500"
              }`}
            >
              {entry.status === "in_progress"
                ? "running"
                : entry.exitCode === null
                  ? entry.status
                  : `${entry.status} exit ${entry.exitCode}`}
            </div>
          </div>
        ) : (
          <div
            key={entry.key}
            className={`${entry.tone} whitespace-pre-wrap border-b border-slate-900 py-2 last:border-0`}
          >
            <span className="mr-2 select-none text-slate-500">{entry.prefix}</span>
            {entry.content}
          </div>
        )
      )}
      {done && (
        <div className="mt-2 border-t border-slate-800 pt-2 text-emerald-400">
          --- Stream ended ---
        </div>
      )}
      <div ref={endRef} />
      </div>
    </div>
  );
}
