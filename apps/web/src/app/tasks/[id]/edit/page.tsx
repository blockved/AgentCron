"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { NavBar } from "@/components/nav-bar";
import { TaskForm } from "@/components/task-form";
import { useAuth } from "@/lib/auth-context";

function EditTaskSkeleton() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6" aria-label="Loading task">
          <div>
            <div className="h-4 w-20 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-72 max-w-full rounded bg-slate-200" />
          </div>
          <div className="h-80 rounded-lg border border-slate-200 bg-white shadow-sm" />
          <div className="h-64 rounded-lg border border-slate-200 bg-white shadow-sm" />
        </div>
      </main>
    </>
  );
}

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [task, setTask] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;

    api.get(`/api/tasks/${id}`).then((res) => setTask(res.data));
  }, [id, user, authLoading, router]);

  if (authLoading || !user || !task) return <EditTaskSkeleton />;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4">
          <p className="text-sm font-medium text-emerald-700">Tasks</p>
          <h1 className="mt-1 truncate text-3xl font-bold tracking-tight text-slate-950">
            Edit {task.name}
          </h1>
        </div>
        <TaskForm initial={task} taskId={id} />
      </main>
    </>
  );
}
