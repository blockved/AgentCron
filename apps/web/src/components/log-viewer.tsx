"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/lib/use-sse";

interface LogViewerProps {
  logs: LogEntry[];
  done: boolean;
}

export function LogViewer({ logs, done }: LogViewerProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const typeColor: Record<string, string> = {
    agent_output: "text-gray-200",
    agent_error: "text-red-400",
    system: "text-blue-400",
    tool_call: "text-yellow-400",
    heartbeat: "text-gray-600",
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-[600px] overflow-y-auto">
      {logs.length === 0 && !done && (
        <p className="text-gray-500">Waiting for logs...</p>
      )}
      {logs.map((log) => (
        <div key={log.id} className={`${typeColor[log.logType] || "text-gray-200"} whitespace-pre-wrap`}>
          <span className="text-gray-600 text-xs mr-2">
            [{new Date(log.createdAt).toLocaleTimeString()}]
          </span>
          {log.content}
        </div>
      ))}
      {done && (
        <div className="text-green-400 mt-2 border-t border-gray-700 pt-2">
          --- Stream ended ---
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
