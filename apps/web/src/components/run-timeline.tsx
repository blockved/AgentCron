"use client";

import { RunStatusBadge } from "./status-badge";

interface TimelineProps {
  run: {
    status: string;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    duration: number | null;
  };
}

export function RunTimeline({ run }: TimelineProps) {
  const steps = [
    { label: "Created", time: run.createdAt, active: true },
    { label: "Started", time: run.startedAt, active: !!run.startedAt },
    { label: "Finished", time: run.finishedAt, active: !!run.finishedAt },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RunStatusBadge status={run.status} />
          {run.duration !== null && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {run.duration}s elapsed
            </span>
          )}
        </div>
        <span className="text-xs font-medium uppercase text-slate-400">
          Execution timeline
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.label}
            className="relative flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-3"
          >
            <div className={`h-3 w-3 rounded-full ${step.active ? "bg-emerald-500" : "bg-slate-300"}`} />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-slate-400">{step.label}</p>
              <p className="mt-1 truncate text-sm text-slate-700">{step.time ? new Date(step.time).toLocaleString() : "-"}</p>
            </div>
            {i < steps.length - 1 && <div className="hidden h-px flex-1 bg-slate-200 md:block" />}
          </div>
        ))}
      </div>
    </div>
  );
}
