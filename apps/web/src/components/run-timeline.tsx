"use client";

interface TimelineProps {
  run: {
    status: string;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    duration: number | null;
  };
}

export function RunTimeline({ run }: TimelineProps) {
  const steps = [
    { label: "Created", time: run.createdAt, active: true },
    { label: "Started", time: run.startedAt, active: !!run.startedAt },
    { label: "Finished", time: run.finishedAt, active: !!run.finishedAt },
  ];

  const statusColor: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    RUNNING: "bg-blue-100 text-blue-800",
    SUCCESS: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    TIMEOUT: "bg-orange-100 text-orange-800",
    CANCELLED: "bg-gray-100 text-gray-800",
    SYSTEM_ERROR: "bg-red-100 text-red-800",
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColor[run.status] || "bg-gray-100"}`}>
          {run.status}
        </span>
        {run.duration !== null && (
          <span className="text-sm text-gray-500">{run.duration}s</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${step.active ? "bg-blue-500" : "bg-gray-300"}`} />
            <div>
              <p className="text-xs text-gray-500">{step.label}</p>
              <p className="text-xs">{step.time ? new Date(step.time).toLocaleString() : "-"}</p>
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>
    </div>
  );
}
