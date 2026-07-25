import { resolveChangeComparison } from "@/lib/submission-change-comparison";

export function AdminChangeComparison({
  payload,
  changedFields,
}: {
  payload: Record<string, unknown>;
  changedFields: Record<string, unknown> | null;
}) {
  const comparison = resolveChangeComparison(payload, changedFields);
  const entries = Object.entries(comparison);

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">No changed fields recorded.</p>;
  }

  return (
    <div className="min-w-0 space-y-3">
      {entries.map(([field, change]) => (
        <div
          key={field}
          className="min-w-0 rounded-md border border-gray-200 bg-white p-3"
        >
          <p className="break-all text-sm font-semibold text-gray-900">{field}</p>
          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            <ComparisonValue
              label="Before"
              value={change.before}
              captured={change.beforeCaptured !== false}
            />
            <ComparisonValue label="After" value={change.after} captured />
          </div>
        </div>
      ))}
    </div>
  );
}

function ComparisonValue({
  label,
  value,
  captured,
}: {
  label: string;
  value: unknown;
  captured: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      {captured ? (
        <pre className="mt-1 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-2 text-xs text-gray-700">
          {formatValue(value)}
        </pre>
      ) : (
        <p className="mt-1 rounded bg-amber-50 p-2 text-xs italic text-amber-700">
          Not captured for this legacy record
        </p>
      )}
    </div>
  );
}

function formatValue(value: unknown) {
  if (value === undefined) return "undefined";
  const formatted = JSON.stringify(value, null, 2);
  return formatted ?? String(value);
}
