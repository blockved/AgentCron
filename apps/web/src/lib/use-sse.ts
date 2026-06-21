"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export interface LogEntry {
  id: string;
  logType: string;
  content: string | null;
  metadata: unknown;
  createdAt: string;
}

interface UseSSEResult {
  logs: LogEntry[];
  done: boolean;
  error: string | null;
  setLogs: Dispatch<SetStateAction<LogEntry[]>>;
  clearError: () => void;
}

export function useSSE(url: string | null) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (!url) return;

    const abortController = new AbortController();
    setLogs([]);
    setDone(false);
    setError(null);

    const readStream = async () => {
      let receivedDone = false;

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: abortController.signal,
        });

        if (!res.ok) {
          throw new Error(`Log stream failed with HTTP ${res.status}`);
        }

        if (!res.body) {
          throw new Error("Log stream is not available.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const rawEvent of events) {
            const lines = rawEvent.split("\n");
            const eventName = lines
              .find((line) => line.startsWith("event:"))
              ?.slice("event:".length)
              .trim();
            const data = lines
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice("data:".length).trimStart())
              .join("\n");

            if (!data) continue;

            if (eventName === "done") {
              receivedDone = true;
              setDone(true);
              continue;
            }

            const entry: LogEntry = JSON.parse(data);
            setLogs((prev) => [...prev, entry]);
          }
        }

        if (!receivedDone) {
          throw new Error("Live log stream disconnected.");
        }
      } catch (streamError) {
        if (!abortController.signal.aborted) {
          setError(
            streamError instanceof Error
              ? streamError.message
              : "Log stream disconnected."
          );
        }
      }
    };

    readStream();

    return () => {
      abortController.abort();
    };
  }, [url]);

  return {
    logs,
    done,
    error,
    setLogs,
    clearError,
  } satisfies UseSSEResult;
}
