import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Gym } from "@gymory/shared";
import { getHkDistrictLabel } from "@gymory/shared";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { AdminDeleteGymButton } from "@/components/admin/AdminDeleteGymButton";
import { AdminVerifyGymButton } from "@/components/admin/AdminVerifyGymButton";

type Locale = "en" | "zh-HK";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

async function getAllGyms(page: number, pageSize: number) {
  const supabase = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from("gyms")
    .select(
      "id, slug, name, name_zh, district_code, is_active, is_verified, updated_at",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
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
  searchParams?: { page?: string; pageSize?: string };
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminSession(
    `/${locale}/login?next=/${locale}/admin/gyms`,
    `/${locale}`
  );

  const t = await getTranslations("admin");
  const tCommon = await getTranslations("common");
  const pageParam = Number(searchParams?.page ?? DEFAULT_PAGE);
  const pageSizeParam = Number(searchParams?.pageSize ?? DEFAULT_PAGE_SIZE);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : DEFAULT_PAGE;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const { gyms, totalCount } = await getAllGyms(page, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentLocale = locale as Locale;
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;
  const paginationItems = buildPaginationItems(page, totalPages);

  function getPageHref(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const params = new URLSearchParams();
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

        {gyms.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No gyms found.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
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
                              {gym.is_active ? "Active" : "Inactive"}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                gym.is_verified
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {gym.is_verified ? "Verified" : "Unverified"}
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
                className="mt-2 flex items-center justify-center gap-2"
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
