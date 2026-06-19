"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { NavBar } from "@/components/nav-bar";
import { TaskForm } from "@/components/task-form";

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);

  useEffect(() => {
    api.get(`/api/tasks/${id}`).then((res) => setTask(res.data));
  }, [id]);

  if (!task) return <><NavBar /><div className="p-8">Loading...</div></>;

  return (
    <>
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit: {task.name}</h1>
        <TaskForm initial={task} taskId={id} />
      </div>
    </>
  );
}
