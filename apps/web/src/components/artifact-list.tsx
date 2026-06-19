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
  if (artifacts.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Artifacts</h3>
      <ul className="space-y-2">
        {artifacts.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm">
            <span>{a.name}</span>
            <a
              href={`/api/runs/${runId}/artifacts/${a.id}`}
              className="text-blue-600 hover:underline"
              download
            >
              Download
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
