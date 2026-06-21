"use client";

import { NavBar } from "@/components/nav-bar";
import { TaskForm } from "@/components/task-form";

export default function NewTaskPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4">
          <p className="text-sm font-medium text-emerald-700">Tasks</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Create task
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Schedule a repeatable agent run with clear instructions, runtime
            limits, and failure notification settings.
          </p>
        </div>
        <TaskForm />
      </main>
    </>
  );
}
