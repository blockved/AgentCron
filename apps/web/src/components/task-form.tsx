"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

interface TaskFormProps {
  initial?: {
    name: string;
    description: string;
    agentType: string;
    project: string;
    taskPrompt: string;
    schedule: { cron: string };
    sessionPolicy: string;
    concurrencyPolicy: string;
    timeoutSeconds: number;
    maxRetries: number;
    notificationConfig: { enabled: boolean; channels: any[]; onStatuses: string[] };
  };
  taskId?: string;
}

export function TaskForm({ initial, taskId }: TaskFormProps) {
  const router = useRouter();
  const isEdit = !!taskId;

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    agentType: initial?.agentType ?? "codex",
    project: initial?.project ?? "",
    taskPrompt: initial?.taskPrompt ?? "",
    cron: initial?.schedule?.cron ?? "0 9 * * 1-5",
    sessionPolicy: initial?.sessionPolicy ?? "always_new",
    concurrencyPolicy: initial?.concurrencyPolicy ?? "skip_if_running",
    timeoutSeconds: initial?.timeoutSeconds ?? 3600,
    maxRetries: initial?.maxRetries ?? 0,
    notifyEnabled: initial?.notificationConfig?.enabled ?? false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      name: form.name,
      description: form.description || undefined,
      agentType: form.agentType,
      project: form.project || undefined,
      taskPrompt: form.taskPrompt,
      schedule: { cron: form.cron },
      sessionPolicy: form.sessionPolicy,
      concurrencyPolicy: form.concurrencyPolicy,
      timeoutSeconds: form.timeoutSeconds,
      maxRetries: form.maxRetries,
      environment: {},
      permissionPolicy: {},
      notificationConfig: {
        enabled: form.notifyEnabled,
        channels: [],
        onStatuses: ["FAILED", "TIMEOUT", "SYSTEM_ERROR"],
      },
    };

    try {
      if (isEdit) {
        await api.patch(`/api/tasks/${taskId}`, payload);
      } else {
        await api.post("/api/tasks", payload);
      }
      router.push("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input value={form.name} onChange={set("name")} required
          className="w-full px-3 py-2 border rounded-md" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={set("description")} rows={2}
          className="w-full px-3 py-2 border rounded-md" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
        <textarea value={form.taskPrompt} onChange={set("taskPrompt")} required rows={6}
          className="w-full px-3 py-2 border rounded-md font-mono text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cron Schedule</label>
          <input value={form.cron} onChange={set("cron")} required
            className="w-full px-3 py-2 border rounded-md font-mono" placeholder="0 9 * * 1-5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Agent Type</label>
          <input value={form.agentType} onChange={set("agentType")} required
            className="w-full px-3 py-2 border rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Policy</label>
          <select value={form.sessionPolicy} onChange={set("sessionPolicy")}
            className="w-full px-3 py-2 border rounded-md">
            <option value="always_new">Always New</option>
            <option value="reuse_fixed">Reuse Fixed</option>
            <option value="reuse_last_success">Reuse Last Success</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Concurrency Policy</label>
          <select value={form.concurrencyPolicy} onChange={set("concurrencyPolicy")}
            className="w-full px-3 py-2 border rounded-md">
            <option value="skip_if_running">Skip If Running</option>
            <option value="queue_if_running">Queue If Running</option>
            <option value="allow_parallel">Allow Parallel</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (seconds)</label>
          <input type="number" value={form.timeoutSeconds}
            onChange={(e) => setForm((f) => ({ ...f, timeoutSeconds: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Retries</label>
          <input type="number" value={form.maxRetries}
            onChange={(e) => setForm((f) => ({ ...f, maxRetries: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border rounded-md" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
          Cancel
        </button>
      </div>
    </form>
  );
}
