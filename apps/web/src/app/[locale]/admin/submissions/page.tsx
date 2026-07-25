import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { AdminSubmissionsReview } from "@/components/admin/AdminSubmissionsReview";
import { AdminSubmissionHistory } from "@/components/admin/AdminSubmissionHistory";
import {
  getPendingSubmissions,
  getSubmissionHistory,
  SUBMISSION_ACTOR_TYPES,
  SUBMISSION_TYPES,
  type SubmissionActorType,
  type SubmissionHistoryFilters,
  type SubmissionTypeFilter,
} from "@/lib/db/queries/submissions";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  setRequestLocale(locale);
  await requireAdminSession(
    `/${locale}/login?next=/${locale}/admin/submissions`,
    `/${locale}`
  );

  const t = await getTranslations("admin");
  const tCommon = await getTranslations("common");
  const tab = getSearchParam(rawSearchParams, "tab") === "history"
    ? "history"
    : "pending";
  const page = parsePositiveInteger(getSearchParam(rawSearchParams, "page"));
  const status = getSearchParam(rawSearchParams, "status");
  const actor = getSearchParam(rawSearchParams, "actor");
  const type = getSearchParam(rawSearchParams, "type");
  const gym = getSearchParam(rawSearchParams, "gym").trim();
  const dateFrom = getSearchParam(rawSearchParams, "from");
  const dateTo = getSearchParam(rawSearchParams, "to");
  const historyFilters: SubmissionHistoryFilters = {
    page,
    pageSize: 25,
    status:
      status === "approved" || status === "rejected" ? status : ("all" as const),
    actorType: SUBMISSION_ACTOR_TYPES.includes(actor as SubmissionActorType)
      ? (actor as SubmissionActorType)
      : ("all" as const),
    submissionType: SUBMISSION_TYPES.includes(type as SubmissionTypeFilter)
      ? (type as SubmissionTypeFilter)
      : ("all" as const),
    gymQuery: gym,
    dateFrom,
    dateTo,
  };
  const [pendingSubmissions, historyResult] = await Promise.all([
    tab === "pending" ? getPendingSubmissions() : Promise.resolve([]),
    tab === "history"
      ? getSubmissionHistory(historyFilters)
      : Promise.resolve(null),
  ]);
  const historyQuery = buildHistoryQuery({
    status: historyFilters.status,
    actor: historyFilters.actorType,
    type: historyFilters.submissionType,
    gym,
    from: dateFrom,
    to: dateTo,
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto min-w-0 max-w-6xl space-y-6">
        <Link
          href="/admin"
          className="inline-block text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          {tCommon("back")}
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("submissions")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review pending changes and inspect the complete gym audit history.
          </p>
        </div>

        <nav
          aria-label="Submission views"
          className="flex flex-wrap gap-2 border-b border-gray-200"
        >
          <Link
            href="/admin/submissions"
            className={tabClassName(tab === "pending")}
          >
            Pending review
          </Link>
          <Link
            href="/admin/submissions?tab=history"
            className={tabClassName(tab === "history")}
          >
            History
          </Link>
        </nav>

        {tab === "pending" ? (
          <AdminSubmissionsReview submissions={pendingSubmissions} />
        ) : (
          <>
            <HistoryFilters
              locale={locale}
              status={historyFilters.status ?? "all"}
              actor={historyFilters.actorType ?? "all"}
              type={historyFilters.submissionType ?? "all"}
              gym={gym}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
            {historyResult ? (
              <AdminSubmissionHistory
                locale={locale}
                result={historyResult}
                query={historyQuery}
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function HistoryFilters({
  locale,
  status,
  actor,
  type,
  gym,
  dateFrom,
  dateTo,
}: {
  locale: string;
  status: "all" | "approved" | "rejected";
  actor: "all" | SubmissionActorType;
  type: "all" | SubmissionTypeFilter;
  gym: string;
  dateFrom: string;
  dateTo: string;
}) {
  return (
    <form
      method="get"
      action={`/${locale}/admin/submissions`}
      className="min-w-0 rounded-lg border border-gray-200 bg-white p-4"
    >
      <input type="hidden" name="tab" value="history" />
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FilterField label="Gym name">
          <input
            name="gym"
            type="search"
            defaultValue={gym}
            placeholder="English or Chinese name"
            className={filterControlClassName}
          />
        </FilterField>
        <FilterField label="Status">
          <select
            name="status"
            defaultValue={status}
            className={filterControlClassName}
          >
            <option value="all">Approved and rejected</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </FilterField>
        <FilterField label="Actor">
          <select
            name="actor"
            defaultValue={actor}
            className={filterControlClassName}
          >
            <option value="all">All actors</option>
            {SUBMISSION_ACTOR_TYPES.map((value) => (
              <option key={value} value={value}>
                {formatOption(value)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Submission type">
          <select
            name="type"
            defaultValue={type}
            className={filterControlClassName}
          >
            <option value="all">All types</option>
            {SUBMISSION_TYPES.map((value) => (
              <option key={value} value={value}>
                {formatOption(value)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="From">
          <input
            name="from"
            type="date"
            defaultValue={dateFrom}
            className={filterControlClassName}
          />
        </FilterField>
        <FilterField label="To">
          <input
            name="to"
            type="date"
            defaultValue={dateTo}
            className={filterControlClassName}
          />
        </FilterField>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Apply filters
        </button>
        <a
          href={`/${locale}/admin/submissions?tab=history`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Reset
        </a>
      </div>
    </form>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="min-w-0 space-y-1.5">
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

const filterControlClassName =
  "block h-10 w-full min-w-0 max-w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";

function tabClassName(active: boolean) {
  return `border-b-2 px-3 py-2 text-sm font-medium ${
    active
      ? "border-gray-900 text-gray-900"
      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900"
  }`;
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parsePositiveInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function formatOption(value: string) {
  return value
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildHistoryQuery(
  values: Record<string, string | undefined>
): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value && value !== "all") {
      query[key] = value;
    }
  }
  return query;
}
