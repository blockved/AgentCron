"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { NavBar } from "@/components/nav-bar";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    api.get(`/api/tasks/${id}`).then((res) => setTask(res.data));
    api.get<{ items: any[] }>(`/api/tasks/${id}/runs`).then((res) => setRuns(res.data.items));
  }, [id]);

  if (!task) return <><NavBar /><div className="p-8">Loading...</div></>;

  return (
    <>
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{task.name}</h1>
          <Link
            href={`/tasks/${id}/edit`}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
          >
            Edit
          </Link>
        </div>

        <div className="bg-white rounded-lg border p-4 mb-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium">{task.status}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Agent Type</dt>
              <dd className="font-medium">{task.agentType}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Schedule</dt>
              <dd className="font-mono">{task.schedule?.cron}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Session Policy</dt>
              <dd>{task.sessionPolicy}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <dt className="text-sm text-gray-500 mb-1">Prompt</dt>
            <dd className="text-sm font-mono bg-gray-50 p-3 rounded whitespace-pre-wrap">
              {task.taskPrompt}
            </dd>
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-3">Run History</h2>
        {runs.length === 0 ? (
          <p className="text-gray-500 text-sm">No runs yet.</p>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">Run ID</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Trigger</th>
                  <th className="text-left px-4 py-2">Duration</th>
                  <th className="text-left px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run: any) => (
                  <tr key={run.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/runs/${run.id}`} className="text-blue-600 hover:underline">
                        #{run.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{run.status}</td>
                    <td className="px-4 py-2">{run.trigger}</td>
                    <td className="px-4 py-2">{run.duration ? `${run.duration}s` : "-"}</td>
                    <td className="px-4 py-2">{new Date(run.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
