"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useSSE } from "@/lib/use-sse";
import { NavBar } from "@/components/nav-bar";
import { RunTimeline } from "@/components/run-timeline";
import { LogViewer } from "@/components/log-viewer";
import { ArtifactList } from "@/components/artifact-list";
import { RunStatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";

function isRunActive(status?: string) {
  return status === "PENDING" || status === "RUNNING";
}

function RunDetailSkeleton() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4" aria-label="Loading run">
          <div>
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-56 rounded bg-slate-200" />
          </div>
          <div className="h-32 rounded-lg border border-slate-200 bg-white shadow-sm" />
          <div className="h-[420px] rounded-lg border border-slate-800 bg-slate-950" />
        </div>
      </main>
    </>
  );
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [run, setRun] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<"cancel" | "rerun" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [useHistoryFallback, setUseHistoryFallback] = useState(false);
  const artifacts: any[] = [];

  const runIsActive = isRunActive(run?.status);
  const shouldStream = runIsActive && !useHistoryFallback;
  const {
    logs,
    done,
    error: streamError,
    setLogs,
    clearError: clearStreamError,
  } = useSSE(
    shouldStream ? `/api/runs/${id}/logs/stream` : null
  );

  const refreshRun = useCallback(async () => {
    const res = await api.get(`/api/runs/${id}`);
    setRun(res.data);
    return res.data;
  }, [id]);

  const loadHistoryLogs = useCallback(async () => {
    setHistoryError(null);
    const res = await api.get<{ items: any[] }>(`/api/runs/${id}/logs?pageSize=200`);
    setHistoryLogs(res.data.items);
    return res.data.items;
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;

    refreshRun().catch((error) => {
      setActionError(error instanceof Error ? error.message : "Run could not be loaded.");
    });
  }, [id, user, authLoading, router, refreshRun]);

  useEffect(() => {
    if (!user) return;
    setUseHistoryFallback(false);
    setHistoryLogs([]);
    setHistoryError(null);
    setLogs([]);
    clearStreamError();
  }, [id, user, setLogs, clearStreamError]);

  useEffect(() => {
    if (!user || !run) return;
    if (!runIsActive || useHistoryFallback) {
      loadHistoryLogs().catch((error) => {
        setHistoryError(error instanceof Error ? error.message : "Logs could not be loaded.");
      });
    }
  }, [run, runIsActive, useHistoryFallback, user, loadHistoryLogs]);

  useEffect(() => {
    if (user && done) {
      clearStreamError();
      refreshRun().catch(() => {});
      loadHistoryLogs().catch(() => {});
    }
  }, [done, user, clearStreamError, refreshRun, loadHistoryLogs]);

  useEffect(() => {
    if (!user || !streamError) return;
    setUseHistoryFallback(true);
    refreshRun().catch(() => {});
    loadHistoryLogs().catch((error) => {
      setHistoryError(error instanceof Error ? error.message : "Logs could not be loaded.");
    });
  }, [streamError, user, refreshRun, loadHistoryLogs]);

  useEffect(() => {
    if (!user || !useHistoryFallback || !runIsActive) return;
    const interval = window.setInterval(() => {
      refreshRun().catch(() => {});
      loadHistoryLogs().catch((error) => {
        setHistoryError(error instanceof Error ? error.message : "Logs could not be loaded.");
      });
    }, 2000);
    return () => window.clearInterval(interval);
  }, [user, useHistoryFallback, runIsActive, refreshRun, loadHistoryLogs]);

  if (authLoading || !user || !run) return <RunDetailSkeleton />;

  const displayLogs = shouldStream ? logs : historyLogs.length > 0 ? historyLogs : logs;

  const handleCancel = async () => {
    setPendingAction("cancel");
    setActionError(null);
    try {
      await api.post(`/api/runs/${id}/cancel`);
      const res = await api.get(`/api/runs/${id}`);
      setRun(res.data);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Cancel failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleRerun = async () => {
    setPendingAction("rerun");
    setActionError(null);
    try {
      const res = await api.post<{ id: string }>(`/api/runs/${id}/rerun`);
      router.push(`/runs/${res.data.id}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "ReRun failed.");
      setPendingAction(null);
    }
  };

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700">Run detail</p>
            <h1 className="mt-1 truncate text-3xl font-bold tracking-tight text-slate-950">
              Run #{id}
            </h1>
            {run.task && (
              <p className="mt-1 truncate text-sm text-slate-500">{run.task.name}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <RunStatusBadge status={run.status} />
              {runIsActive && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 text-xs font-semibold text-sky-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                  {shouldStream ? "Streaming logs" : "Refreshing logs"}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(run.status === "PENDING" || run.status === "RUNNING") && (
              <button
                onClick={handleCancel}
                disabled={pendingAction !== null}
                className="min-h-11 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-800 transition duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAction === "cancel" ? "Cancelling..." : "Cancel"}
              </button>
            )}
            <button
              onClick={handleRerun}
              disabled={pendingAction !== null}
              aria-busy={pendingAction === "rerun"}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
            >
              {pendingAction === "rerun" && (
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
              )}
              {pendingAction === "rerun" ? "Starting..." : "ReRun"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {actionError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {actionError}
            </div>
          )}

          <RunTimeline run={run} />

          {run.errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {run.errorMessage}
            </div>
          )}

          <div>
            <h2 className="mb-2 text-lg font-bold text-slate-950">Logs</h2>
            {streamError && !useHistoryFallback && (
              <div
                role="alert"
                className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                {streamError}
              </div>
            )}
            {historyError && (
              <div
                role="alert"
                className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                {historyError}
              </div>
            )}
            <LogViewer logs={displayLogs} done={done || !runIsActive} />
          </div>

          <ArtifactList runId={id} artifacts={artifacts} />
        </div>
      </main>
    </>
  );
}
