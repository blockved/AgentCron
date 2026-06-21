"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { TaskStatusBadge } from "./status-badge";

interface TaskCardProps {
  task: {
    id: string;
    name: string;
    agentType: string;
    status: string;
    schedule: { cron: string };
    lastRunAt: string | null;
    nextRunAt: string | null;
  };
  onRefresh: () => void;
}

type TaskAction = "enable" | "disable" | "trigger";

export function TaskCard({ task, onRefresh }: TaskCardProps) {
  const router = useRouter();
  const isPaused = task.status === "paused";
  const [pendingAction, setPendingAction] = useState<TaskAction | null>(null);
  const [showTriggerConfirm, setShowTriggerConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleAction = async (action: TaskAction) => {
    let keepPending = false;
    setPendingAction(action);
    setFeedback(null);
    if (action === "trigger") setShowTriggerConfirm(false);

    try {
      const res = await api.post<{ id: string }>(`/api/tasks/${task.id}/${action}`);

      if (action === "trigger") {
        keepPending = true;
        setFeedback({
          type: "success",
          text: `Run #${res.data.id} created. Opening logs...`,
        });
        router.push(`/runs/${res.data.id}`);
        return;
      }

      onRefresh();
      setFeedback({
        type: "success",
        text: action === "enable" ? "Task enabled." : "Task paused.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Action failed.",
      });
      if (action === "trigger") setShowTriggerConfirm(false);
    } finally {
      if (!keepPending) setPendingAction(null);
    }
  };

  const requestTriggerConfirmation = () => {
    setFeedback(null);
    setShowTriggerConfirm(true);
  };

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleString() : "-";

  return (
    <article className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              {task.agentType}
            </span>
          </div>
          <Link
            href={`/tasks/${task.id}`}
            className="mt-3 flex min-h-11 items-center truncate text-base font-semibold text-slate-950 transition hover:text-emerald-700"
          >
            {task.name}
          </Link>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium uppercase text-slate-400">
                Cron
              </p>
              <p className="mt-1 font-mono text-slate-800">
                {task.schedule.cron}
              </p>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium uppercase text-slate-400">
                Last run
              </p>
              <p className="mt-1 truncate">{formatDate(task.lastRunAt)}</p>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium uppercase text-slate-400">
                Next run
              </p>
              <p className="mt-1 truncate">{formatDate(task.nextRunAt)}</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          {isPaused ? (
            <button
              onClick={() => {
                setShowTriggerConfirm(false);
                handleAction("enable");
              }}
              disabled={pendingAction !== null}
              className="min-h-11 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-800 transition duration-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction === "enable" ? "Enabling..." : "Enable"}
            </button>
          ) : (
            <button
              onClick={() => {
                setShowTriggerConfirm(false);
                handleAction("disable");
              }}
              disabled={pendingAction !== null}
              className="min-h-11 rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-800 transition duration-200 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction === "disable" ? "Pausing..." : "Pause"}
            </button>
          )}
          <button
            onClick={requestTriggerConfirmation}
            disabled={pendingAction !== null || showTriggerConfirm}
            aria-busy={pendingAction === "trigger"}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
          >
            {pendingAction === "trigger" && (
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            )}
            {pendingAction === "trigger"
              ? "Starting..."
              : showTriggerConfirm
                ? "Confirm below"
                : "Trigger"}
          </button>
          <button
            onClick={() => router.push(`/tasks/${task.id}/edit`)}
            disabled={pendingAction !== null}
            className="min-h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Edit
          </button>
        </div>
      </div>
      {showTriggerConfirm && (
        <div
          role="group"
          aria-label={`Confirm trigger for ${task.name}`}
          className="mt-4 border-t border-slate-100 pt-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">
                Trigger this task now?
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                A manual run will be created and the live execution log will
                open immediately.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowTriggerConfirm(false)}
                disabled={pendingAction !== null}
                className="min-h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAction("trigger")}
                disabled={pendingAction !== null}
                aria-busy={pendingAction === "trigger"}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
              >
                {pendingAction === "trigger" && (
                  <span
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                )}
                {pendingAction === "trigger" ? "Starting..." : "Confirm trigger"}
              </button>
            </div>
          </div>
        </div>
      )}
      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            feedback.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {feedback.text}
        </div>
      )}
    </article>
  );
}
