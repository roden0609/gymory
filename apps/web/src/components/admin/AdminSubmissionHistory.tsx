import { Link } from "@/i18n/navigation";
import type {
  SubmissionPage,
  SubmissionReviewRow,
} from "@/lib/db/queries/submissions";

type AdminSubmissionHistoryProps = {
  locale: string;
  result: SubmissionPage;
  query: Record<string, string>;
};

export function AdminSubmissionHistory({
  locale,
  result,
  query,
}: AdminSubmissionHistoryProps) {
  if (result.submissions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-500">
        No submission history matches these filters.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm text-gray-500">
        {result.totalCount.toLocaleString(locale)} historical submissions
      </p>

      {result.submissions.map((submission) => (
        <HistoryCard
          key={submission.id}
          locale={locale}
          submission={submission}
        />
      ))}

      <HistoryPagination locale={locale} result={result} query={query} />
    </div>
  );
}

function HistoryCard({
  locale,
  submission,
}: {
  locale: string;
  submission: SubmissionReviewRow;
}) {
  const displayName =
    locale === "zh-HK" && submission.gyms?.name_zh
      ? submission.gyms.name_zh
      : submission.gyms?.name ?? "Deleted or unlinked gym";
  const submitter =
    submission.submitter?.display_name ??
    submission.submitter?.firebase_email ??
    actorLabel(submission.actor_type);
  const reviewer =
    submission.reviewer?.display_name ??
    submission.reviewer?.firebase_email ??
    "System";

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="break-words text-base font-semibold text-gray-900">
              {submission.submission_type}
            </h2>
            <ActionBadge action={submission.action_type} />
          </div>
          <p className="mt-1 break-words text-sm text-gray-600">
            {submission.gyms?.slug ? (
              <Link
                href={`/gyms/${submission.gyms.slug}`}
                className="font-medium text-gray-900 underline-offset-2 hover:underline"
              >
                {displayName}
              </Link>
            ) : (
              displayName
            )}
          </p>
          <p className="mt-1 break-all text-xs text-gray-400">
            {submission.id}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      <dl className="mt-4 grid min-w-0 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <HistoryMeta label="Actor" value={actorLabel(submission.actor_type)} />
        <HistoryMeta label="Submitted by" value={submitter} />
        <HistoryMeta label="Reviewed by" value={reviewer} />
        <HistoryMeta
          label="Submitted"
          value={formatDateTime(submission.created_at, locale)}
        />
        <HistoryMeta
          label="Reviewed"
          value={
            submission.reviewed_at
              ? formatDateTime(submission.reviewed_at, locale)
              : "—"
          }
        />
      </dl>

      {submission.review_notes ? (
        <div className="mt-4 rounded-md bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Review notes
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">
            {submission.review_notes}
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <JsonDetails
          title="Changed fields"
          value={submission.changed_fields}
          initiallyOpen
        />
        <JsonDetails title="Full payload" value={submission.payload} />
      </div>
    </article>
  );
}

function HistoryMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-gray-700">{value}</dd>
    </div>
  );
}

function JsonDetails({
  title,
  value,
  initiallyOpen = false,
}: {
  title: string;
  value: unknown;
  initiallyOpen?: boolean;
}) {
  return (
    <details
      open={initiallyOpen}
      className="min-w-0 overflow-hidden rounded-md border border-gray-200"
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-700">
        {title}
      </summary>
      <div className="max-w-full overflow-x-auto border-t border-gray-200 bg-gray-50">
        <pre className="w-max min-w-full p-3 text-xs text-gray-700">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    </details>
  );
}

function StatusBadge({ status }: { status: SubmissionReviewRow["status"] }) {
  const className =
    status === "approved"
      ? "bg-green-50 text-green-700"
      : status === "rejected"
        ? "bg-red-50 text-red-700"
        : "bg-yellow-50 text-yellow-700";
  return (
    <span
      className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${className}`}
    >
      {status}
    </span>
  );
}

function ActionBadge({
  action,
}: {
  action: SubmissionReviewRow["action_type"];
}) {
  const label = action === "I" ? "Insert" : action === "D" ? "Delete" : "Update";
  return (
    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      {label}
    </span>
  );
}

function HistoryPagination({
  locale,
  result,
  query,
}: AdminSubmissionHistoryProps) {
  if (result.totalPages <= 1) return null;

  return (
    <nav
      aria-label="Submission history pagination"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
    >
      <p className="text-sm text-gray-500">
        Page {result.page} of {result.totalPages}
      </p>
      <div className="flex flex-wrap gap-2">
        {result.page > 1 ? (
          <a
            href={buildPageHref(locale, query, result.page - 1)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Previous
          </a>
        ) : null}
        {result.page < result.totalPages ? (
          <a
            href={buildPageHref(locale, query, result.page + 1)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next
          </a>
        ) : null}
      </div>
    </nav>
  );
}

function buildPageHref(
  locale: string,
  query: Record<string, string>,
  page: number
) {
  const params = new URLSearchParams({ ...query, tab: "history" });
  params.set("page", String(page));
  return `/${locale}/admin/submissions?${params.toString()}`;
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function actorLabel(actor: SubmissionReviewRow["actor_type"]) {
  return actor
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}
