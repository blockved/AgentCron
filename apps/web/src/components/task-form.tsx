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

  const inputClass =
    "min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
  const textareaClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
  const hintClass = "mt-1.5 text-xs leading-5 text-slate-500";
  const sectionClass =
    "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-start">
        <section className={sectionClass}>
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-950">
              Task profile
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Clear instructions make run history easier to audit.
            </p>
          </div>
          <div className="grid gap-3">
            <div>
              <label htmlFor="task-name" className={labelClass}>
                Name
              </label>
              <input
                id="task-name"
                value={form.name}
                onChange={set("name")}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="task-description" className={labelClass}>
                Description
              </label>
              <textarea
                id="task-description"
                value={form.description}
                onChange={set("description")}
                rows={2}
                className={textareaClass}
              />
            </div>

            <div>
              <label htmlFor="task-prompt" className={labelClass}>
                Prompt
              </label>
              <textarea
                id="task-prompt"
                value={form.taskPrompt}
                onChange={set("taskPrompt")}
                required
                rows={9}
                className={`${textareaClass} min-h-[236px] font-mono leading-6 lg:min-h-[252px]`}
              />
              <p className={hintClass}>
                Include repo context, expected output, and success criteria.
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className={sectionClass}>
            <div className="mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-950">
                Schedule and runtime
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Control timing, agent context, and overlap behavior.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="task-cron" className={labelClass}>
                  Cron schedule
                </label>
                <input
                  id="task-cron"
                  value={form.cron}
                  onChange={set("cron")}
                  required
                  className={`${inputClass} font-mono`}
                  placeholder="0 9 * * 1-5"
                />
                <p className={hintClass}>Weekdays at 09:00.</p>
              </div>
              <div>
                <label htmlFor="task-agent-type" className={labelClass}>
                  Agent type
                </label>
                <input
                  id="task-agent-type"
                  value={form.agentType}
                  onChange={set("agentType")}
                  required
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="task-project" className={labelClass}>
                  Project path
                </label>
                <input
                  id="task-project"
                  value={form.project}
                  onChange={set("project")}
                  className={inputClass}
                  placeholder="/workspace/project"
                />
              </div>
              <div>
                <label htmlFor="task-session-policy" className={labelClass}>
                  Session policy
                </label>
                <select
                  id="task-session-policy"
                  value={form.sessionPolicy}
                  onChange={set("sessionPolicy")}
                  className={inputClass}
                >
                  <option value="always_new">Always new</option>
                  <option value="reuse_fixed">Reuse fixed</option>
                  <option value="reuse_last_success">Reuse last success</option>
                </select>
              </div>
              <div>
                <label htmlFor="task-concurrency-policy" className={labelClass}>
                  Concurrency policy
                </label>
                <select
                  id="task-concurrency-policy"
                  value={form.concurrencyPolicy}
                  onChange={set("concurrencyPolicy")}
                  className={inputClass}
                >
                  <option value="skip_if_running">Skip if running</option>
                  <option value="queue_if_running">Queue if running</option>
                  <option value="allow_parallel">Allow parallel</option>
                </select>
              </div>

              <div>
                <label htmlFor="task-timeout" className={labelClass}>
                  Timeout seconds
                </label>
                <input
                  id="task-timeout"
                  type="number"
                  min={60}
                  value={form.timeoutSeconds}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      timeoutSeconds: Number.parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="task-max-retries" className={labelClass}>
                  Max retries
                </label>
                <input
                  id="task-max-retries"
                  type="number"
                  min={0}
                  value={form.maxRetries}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxRetries: Number.parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Failure notifications
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Notify configured channels on failed, timed out, or system
                  error runs.
                </p>
              </div>
              <label className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.notifyEnabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notifyEnabled: e.target.checked }))
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
                Enabled
              </label>
            </div>
          </section>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3 lg:justify-end">
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="min-h-11 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
