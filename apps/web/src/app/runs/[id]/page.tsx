"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useSSE } from "@/lib/use-sse";
import { NavBar } from "@/components/nav-bar";
import { RunTimeline } from "@/components/run-timeline";
import { LogViewer } from "@/components/log-viewer";
import { ArtifactList } from "@/components/artifact-list";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<any>(null);
  const [artifacts, setArtifacts] = useState<any[]>([]);

  const isStreaming = run && (run.status === "PENDING" || run.status === "RUNNING");
  const { logs, done } = useSSE(
    isStreaming ? `/api/runs/${id}/logs/stream` : null
  );

  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get(`/api/runs/${id}`).then((res) => setRun(res.data));
  }, [id]);

  useEffect(() => {
    if (run && !isStreaming) {
      api
        .get<{ items: any[] }>(`/api/runs/${id}/logs?pageSize=200`)
        .then((res) => setHistoryLogs(res.data.items));
    }
  }, [run, isStreaming, id]);

  if (!run) return <><NavBar /><div className="p-8">Loading...</div></>;

  const displayLogs = isStreaming ? logs : historyLogs;

  const handleCancel = async () => {
    await api.post(`/api/runs/${id}:cancel`);
    const res = await api.get(`/api/runs/${id}`);
    setRun(res.data);
  };

  const handleRerun = async () => {
    await api.post(`/api/runs/${id}:rerun`);
  };

  return (
    <>
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Run #{id}
            {run.task && (
              <span className="text-lg text-gray-500 ml-2">({run.task.name})</span>
            )}
          </h1>
          <div className="flex gap-2">
            {(run.status === "PENDING" || run.status === "RUNNING") && (
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleRerun}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
            >
              Rerun
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <RunTimeline run={run} />

          {run.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {run.errorMessage}
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Logs</h2>
            <LogViewer logs={displayLogs} done={done || !isStreaming} />
          </div>

          <ArtifactList runId={id} artifacts={artifacts} />
        </div>
      </div>
    </>
  );
}
