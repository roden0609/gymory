import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Gym } from "@gymory/shared";
import { getHkDistrictLabel, HK_DISTRICTS } from "@gymory/shared";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { gymNameFilter } from "@/lib/db/queries/gym-name-filter";
import { AdminDeleteGymButton } from "@/components/admin/AdminDeleteGymButton";
import { AdminVerifyGymButton } from "@/components/admin/AdminVerifyGymButton";

type Locale = "en" | "zh-HK";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const STATUSES = ["active", "inactive", "verified", "unverified"] as const;
type GymStatus = (typeof STATUSES)[number];
type GymFilters = { name: string; district: string; status?: GymStatus };

async function getAllGyms(page: number, pageSize: number, filters: GymFilters) {
  const supabase = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("gyms")
    .select(
      "id, slug, name, name_zh, district_code, is_active, is_verified, updated_at",
      { count: "exact" }
    );

  if (filters.name) query = query.or(gymNameFilter(filters.name));
  if (filters.district) query = query.eq("district_code", filters.district);
  if (filters.status === "active" || filters.status === "inactive") {
    query = query.eq("is_active", filters.status === "active");
  } else if (filters.status) {
    query = query.eq("is_verified", filters.status === "verified");
  }

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .order("id")
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return {
    gyms: (data ?? []) as Pick<
      Gym,
      | "id"
      | "slug"
      | "name"
      | "name_zh"
      | "district_code"
      | "is_active"
      | "is_verified"
      | "updated_at"
    >[],
    totalCount: count ?? 0,
  };
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function buildPaginationItems(
  currentPage: number,
  totalPages: number
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < totalPages - 1) items.push("ellipsis");

  items.push(totalPages);
  return items;
}

export default async function AdminGymsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: { page?: string; pageSize?: string; name?: string | string[]; district?: string; status?: string };
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminSession(
    `/${locale}/login?next=/${locale}/admin/gyms`,
    `/${locale}`
  );

  const t = await getTranslations("admin");
  const tCommon = await getTranslations("common");
  const tSearch = await getTranslations("search");
  const pageParam = Number(searchParams?.page ?? DEFAULT_PAGE);
  const pageSizeParam = Number(searchParams?.pageSize ?? DEFAULT_PAGE_SIZE);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : DEFAULT_PAGE;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const filters: GymFilters = {
    name: typeof searchParams?.name === "string" ? searchParams.name.trim().slice(0, 200) : "",
    district: HK_DISTRICTS.find(({ code }) => code === searchParams?.district)?.code ?? "",
    status: STATUSES.find((status) => status === searchParams?.status),
  };
  const { gyms, totalCount } = await getAllGyms(page, pageSize, filters);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentLocale = locale as Locale;
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;
  const paginationItems = buildPaginationItems(page, totalPages);
  const filterParams = new URLSearchParams();
  if (filters.name) filterParams.set("name", filters.name);
  if (filters.district) filterParams.set("district", filters.district);
  if (filters.status) filterParams.set("status", filters.status);
  const fieldClassName = "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900";

  function getPageHref(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const params = new URLSearchParams(filterParams);
    if (safePage > 1) params.set("page", String(safePage));
    if (pageSize !== DEFAULT_PAGE_SIZE) {
      params.set("pageSize", String(pageSize));
    }
    const query = params.toString();
    return query ? `/admin/gyms?${query}` : "/admin/gyms";
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/admin"
          className="inline-block text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          {tCommon("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t("manageGyms")}</h1>

        <form key={filterParams.toString()} method="get" className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          {pageSize !== DEFAULT_PAGE_SIZE && <input type="hidden" name="pageSize" value={pageSize} />}
          <div className="min-w-0 space-y-1 text-sm font-medium text-gray-700">
            <label htmlFor="gym-filter-name" className="block">{tSearch("gymName")}</label>
            <input id="gym-filter-name" type="search" name="name" maxLength={200} defaultValue={filters.name} className={fieldClassName} />
          </div>
          <div className="min-w-0 space-y-1 text-sm font-medium text-gray-700">
            <label htmlFor="gym-filter-district" className="block">{tSearch("district")}</label>
            <select id="gym-filter-district" name="district" defaultValue={filters.district} className={fieldClassName}>
              <option value="">{tSearch("anyDistrict")}</option>
              {HK_DISTRICTS.map(({ code }) => (
                <option key={code} value={code}>{getHkDistrictLabel(code, currentLocale)}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0 space-y-1 text-sm font-medium text-gray-700">
            <label htmlFor="gym-filter-status" className="block">{t("gymStatus.label")}</label>
            <select id="gym-filter-status" name="status" defaultValue={filters.status ?? ""} className={fieldClassName}>
              <option value="">{t("gymStatus.any")}</option>
              {STATUSES.map((status) => <option key={status} value={status}>{t(`gymStatus.${status}`)}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
              {tSearch("applyFilters")}
            </button>
            {filterParams.size > 0 && (
              <Link href={pageSize === DEFAULT_PAGE_SIZE ? "/admin/gyms" : `/admin/gyms?pageSize=${pageSize}`}
                className="text-sm text-gray-600 underline underline-offset-2">
                {tSearch("clearFilters")}
              </Link>
            )}
          </div>
        </form>

        {gyms.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
            {t("noGymsFound")}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Gym</th>
                    <th className="px-4 py-3 font-medium">District</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {gyms.map((gym) => {
                    const displayName =
                      currentLocale === "zh-HK" && gym.name_zh ? gym.name_zh : gym.name;

                    return (
                      <tr key={gym.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {displayName}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {getHkDistrictLabel(gym.district_code, currentLocale)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                gym.is_active
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {t(gym.is_active ? "gymStatus.active" : "gymStatus.inactive")}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                gym.is_verified
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {t(gym.is_verified ? "gymStatus.verified" : "gymStatus.unverified")}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(gym.updated_at, currentLocale)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/gyms/${gym.slug}`}
                              className="text-sm font-medium text-gray-700 underline-offset-2 hover:text-gray-900 hover:underline"
                            >
                              View
                            </Link>
                            <Link
                              href={`/admin/gyms/${gym.id}/equipment`}
                              className="text-sm font-medium text-blue-700 underline-offset-2 hover:text-blue-900 hover:underline"
                            >
                              Equipment
                            </Link>
                            <AdminVerifyGymButton
                              gymId={gym.id}
                              isActive={gym.is_active}
                              isVerified={gym.is_verified}
                            />
                            <AdminDeleteGymButton
                              gymId={gym.id}
                              gymName={displayName}
                              isActive={gym.is_active}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-2 flex flex-wrap items-center justify-center gap-2"
              >
                <Link
                  href={getPageHref(page - 1)}
                  aria-disabled={!canGoPrev}
                  className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    canGoPrev
                      ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                      : "pointer-events-none border-gray-200 text-gray-300"
                  }`}
                >
                  Previous
                </Link>

                {paginationItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} className="px-1 text-sm text-gray-400">
                      ...
                    </span>
                  ) : (
                    <Link
                      key={item}
                      href={getPageHref(item)}
                      aria-current={item === page ? "page" : undefined}
                      className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        item === page
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {item}
                    </Link>
                  )
                )}

                <Link
                  href={getPageHref(page + 1)}
                  aria-disabled={!canGoNext}
                  className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    canGoNext
                      ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                      : "pointer-events-none border-gray-200 text-gray-300"
                  }`}
                >
                  Next
                </Link>
              </nav>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
