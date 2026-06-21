"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { NavBar } from "@/components/nav-bar";
import { RunStatusBadge, TaskStatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";

function TaskDetailSkeleton() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6" aria-label="Loading task">
          <div>
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-80 max-w-full rounded bg-slate-200" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-7 w-48 rounded bg-slate-100" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="h-16 rounded-md bg-slate-100" />
              <div className="h-16 rounded-md bg-slate-100" />
              <div className="h-16 rounded-md bg-slate-100" />
              <div className="h-16 rounded-md bg-slate-100" />
            </div>
            <div className="mt-5 h-40 rounded-md bg-slate-100" />
          </div>
        </div>
      </main>
    </>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;

    api.get(`/api/tasks/${id}`).then((res) => setTask(res.data));
    api
      .get<{ items: any[] }>(`/api/tasks/${id}/runs`)
      .then((res) => setRuns(res.data.items));
  }, [id, user, authLoading, router]);

  if (authLoading || !user || !task) return <TaskDetailSkeleton />;

  const openRun = (runId: string) => {
    router.push(`/runs/${runId}`);
  };

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700">Task detail</p>
            <h1 className="mt-1 max-w-4xl break-words text-3xl font-bold leading-tight tracking-tight text-slate-950">
              {task.name}
            </h1>
            {task.description && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {task.description}
              </p>
            )}
          </div>
          <Link
            href={`/tasks/${id}/edit`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:bg-slate-50"
          >
            Edit
          </Link>
        </div>

        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
            <TaskStatusBadge status={task.status} />
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              {task.agentType}
            </span>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
              <dt className="text-slate-500">Status</dt>
              <dd className="mt-1 font-medium text-slate-950">{task.status}</dd>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
              <dt className="text-slate-500">Agent Type</dt>
              <dd className="mt-1 font-medium text-slate-950">{task.agentType}</dd>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
              <dt className="text-slate-500">Schedule</dt>
              <dd className="mt-1 font-mono text-slate-950">{task.schedule?.cron}</dd>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
              <dt className="text-slate-500">Session Policy</dt>
              <dd className="mt-1 text-slate-950">{task.sessionPolicy}</dd>
            </div>
          </dl>
          <div className="mt-5">
            <p className="mb-1.5 text-sm font-medium text-slate-500">Prompt</p>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-950 p-3 font-mono text-sm leading-6 text-slate-100">
              {task.taskPrompt}
            </pre>
          </div>
        </section>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-950">Run history</h2>
          <span className="text-sm text-slate-500">{runs.length} runs</span>
        </div>
        {runs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 shadow-sm">
            No runs yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Run ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Trigger</th>
                  <th className="px-4 py-3 text-left font-semibold">Duration</th>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((run: any) => (
                  <tr
                    key={run.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open logs for run ${run.id}`}
                    onClick={() => openRun(run.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openRun(run.id);
                      }
                    }}
                    className="cursor-pointer transition duration-200 hover:bg-emerald-50/60 focus:bg-emerald-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-emerald-700">
                        #{run.id}
                      </span>
                    </td>
                    <td className="px-4 py-3"><RunStatusBadge status={run.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{run.trigger}</td>
                    <td className="px-4 py-3 text-slate-600">{run.duration ? `${run.duration}s` : "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(run.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
