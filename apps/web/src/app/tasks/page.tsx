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
    <div className="space-y-2" aria-label="Loading tasks">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-20 rounded bg-slate-200" />
              <div className="h-5 w-24 rounded-full bg-slate-100" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="h-8 rounded-md bg-slate-100" />
              <div className="h-8 rounded-md bg-slate-100" />
              <div className="h-8 rounded-md bg-slate-100" />
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

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
  const agentTypes = Array.from(new Set(tasks.map((task) => task.agentType).filter(Boolean))).sort();
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) => {
    const matchesQuery =
      !normalizedQuery ||
      task.name?.toLowerCase().includes(normalizedQuery) ||
      task.schedule?.cron?.toLowerCase().includes(normalizedQuery) ||
      task.agentType?.toLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesAgent = agentFilter === "all" || task.agentType === agentFilter;
    return matchesQuery && matchesStatus && matchesAgent;
  });
  const hasFilters = normalizedQuery || statusFilter !== "all" || agentFilter !== "all";

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setAgentFilter("all");
  };

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Workspace</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Scheduled tasks
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600">
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

        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">Total tasks</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {tasks.length}
            </p>
            <p className="text-xs text-slate-500">
              Across this workspace
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase text-emerald-800">Active</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-950">
              {activeCount}
            </p>
            <p className="text-xs text-emerald-800/80">
              Eligible for scheduled runs
            </p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase text-sky-800">Scheduled</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-sky-950">
              {nextRunCount}
            </p>
            <p className="text-xs text-sky-800/80">
              {pausedCount} paused
            </p>
          </div>
        </div>

        <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm lg:grid-cols-[minmax(16rem,1fr)_10rem_12rem_auto]">
          <label className="sr-only" htmlFor="task-search">Search tasks</label>
          <input
            id="task-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, cron, agent"
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <label className="sr-only" htmlFor="task-status-filter">Filter by status</label>
          <select
            id="task-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
          <label className="sr-only" htmlFor="task-agent-filter">Filter by agent type</label>
          <select
            id="task-agent-filter"
            value={agentFilter}
            onChange={(event) => setAgentFilter(event.target.value)}
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All agents</option>
            {agentTypes.map((agentType) => (
              <option key={agentType} value={agentType}>
                {agentType}
              </option>
            ))}
          </select>
          <div className="flex min-h-10 items-center justify-between gap-2 text-sm text-slate-600 lg:justify-end">
            <span className="whitespace-nowrap">
              {filteredTasks.length}/{tasks.length}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
            )}
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
          <>
            {filteredTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">
                  No tasks match the current filters
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Adjust the search, status, or agent type to widen the list.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onRefresh={fetchTasks} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
