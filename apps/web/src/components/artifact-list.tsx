"use client";

interface ArtifactListProps {
  runId: string;
  artifacts: Array<{
    id: string;
    name: string;
    artifactType: string;
    createdAt: string;
  }>;
}

export function ArtifactList({ runId, artifacts }: ArtifactListProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">Artifacts</h3>
        <span className="text-xs font-medium text-slate-500">
          {artifacts.length} files
        </span>
      </div>
      {artifacts.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
          No artifacts were collected for this run.
        </div>
      ) : (
      <ul className="divide-y divide-slate-100">
        {artifacts.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-4 py-2 text-sm">
            <span className="truncate text-slate-700">{a.name}</span>
            <a
              href={`/api/runs/${runId}/artifacts/${a.id}`}
              className="inline-flex min-h-11 shrink-0 items-center font-medium text-emerald-700 hover:underline"
              download
            >
              Download
            </a>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
