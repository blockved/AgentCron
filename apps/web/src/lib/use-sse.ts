"use client";

import { useEffect, useRef, useState } from "react";

export interface LogEntry {
  id: string;
  logType: string;
  content: string | null;
  metadata: unknown;
  createdAt: string;
}

export function useSSE(url: string | null) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      const entry: LogEntry = JSON.parse(event.data);
      setLogs((prev) => [...prev, entry]);
    };

    es.addEventListener("done", () => {
      setDone(true);
      es.close();
    });

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [url]);

  return { logs, done };
}
