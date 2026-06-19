"use client";

import Link from "next/link";
import { api } from "@/lib/api-client";
import { useRouter } from "next/navigation";

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

export function TaskCard({ task, onRefresh }: TaskCardProps) {
  const router = useRouter();

  const handleAction = async (action: "enable" | "disable" | "trigger") => {
    await api.post(`/api/tasks/${task.id}:${action}`);
    onRefresh();
  };

  const statusColor =
    task.status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/tasks/${task.id}`}
            className="text-lg font-medium text-gray-900 hover:text-blue-600"
          >
            {task.name}
          </Link>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <span>{task.agentType}</span>
            <span>·</span>
            <span>{task.schedule.cron}</span>
          </div>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}
        >
          {task.status}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {task.status === "paused" ? (
          <button
            onClick={() => handleAction("enable")}
            className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
          >
            Enable
          </button>
        ) : (
          <button
            onClick={() => handleAction("disable")}
            className="px-3 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
          >
            Pause
          </button>
        )}
        <button
          onClick={() => handleAction("trigger")}
          className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
        >
          Trigger
        </button>
        <button
          onClick={() => router.push(`/tasks/${task.id}/edit`)}
          className="px-3 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
