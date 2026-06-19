"use client";

import { NavBar } from "@/components/nav-bar";
import { TaskForm } from "@/components/task-form";

export default function NewTaskPage() {
  return (
    <>
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Task</h1>
        <TaskForm />
      </div>
    </>
  );
}
