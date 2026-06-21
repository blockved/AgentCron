"use client";

type Tone = "green" | "gray" | "blue" | "amber" | "red" | "orange" | "violet";

const toneClass: Record<Tone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  gray: "border-slate-200 bg-slate-100 text-slate-700",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-800",
  orange: "border-orange-200 bg-orange-50 text-orange-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
};

function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold capitalize ${toneClass[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: string }) {
  const tone: Tone =
    status === "active" ? "green" : status === "paused" ? "amber" : "gray";

  return <Badge label={status} tone={tone} />;
}

export function RunStatusBadge({ status }: { status: string }) {
  const toneByStatus: Record<string, Tone> = {
    PENDING: "amber",
    RUNNING: "blue",
    SUCCESS: "green",
    FAILED: "red",
    TIMEOUT: "orange",
    CANCELLED: "gray",
    SYSTEM_ERROR: "red",
    NEEDS_REVIEW: "violet",
    PARTIAL_SUCCESS: "amber",
    NO_ACTION: "gray",
    SKIPPED: "gray",
  };

  return <Badge label={status} tone={toneByStatus[status] || "gray"} />;
}
