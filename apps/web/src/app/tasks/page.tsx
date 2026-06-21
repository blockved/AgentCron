"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { NavBar } from "@/components/nav-bar";
import { TaskCard } from "@/components/task-card";
import { useRouter } from "next/navigation";

function TasksSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading tasks">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="animate-pulse space-y-4">
            <div className="flex gap-2">
              <div className="h-7 w-20 rounded-full bg-slate-200" />
              <div className="h-7 w-16 rounded-full bg-slate-100" />
            </div>
            <div className="h-5 w-2/3 rounded bg-slate-200" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="h-14 rounded-md bg-slate-100" />
              <div className="h-14 rounded-md bg-slate-100" />
              <div className="h-14 rounded-md bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await api.get<{ items: any[] }>("/api/tasks");
      setTasks(res.data.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) fetchTasks();
  }, [user, authLoading]);

  if (authLoading || !user) return null;

  const activeCount = tasks.filter((task) => task.status === "active").length;
  const pausedCount = tasks.filter((task) => task.status === "paused").length;
  const nextRunCount = tasks.filter((task) => task.nextRunAt).length;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Workspace</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Scheduled tasks
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Monitor recurring agent work, inspect upcoming runs, and trigger
              operational tasks when needed.
            </p>
          </div>
          <Link
            href="/tasks/new"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-emerald-700"
          >
            New Task
          </Link>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total tasks</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {tasks.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across this workspace
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-sm font-medium text-emerald-800">Active</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">
              {activeCount}
            </p>
            <p className="mt-1 text-xs text-emerald-800/80">
              Eligible for scheduled runs
            </p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <p className="text-sm font-medium text-sky-800">Scheduled</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-sky-950">
              {nextRunCount}
            </p>
            <p className="mt-1 text-xs text-sky-800/80">
              {pausedCount} paused
            </p>
          </div>
        </div>

        {loading ? (
          <TasksSkeleton />
        ) : tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              No scheduled tasks yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Create the first recurring agent job, then AgentCron will show
              run timing, state, and history here.
            </p>
            <Link
              href="/tasks/new"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition duration-200 hover:bg-emerald-700"
            >
              New Task
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onRefresh={fetchTasks} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
