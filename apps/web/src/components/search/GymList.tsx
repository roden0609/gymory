"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { GymSummary } from "@gymory/shared";
import { Link, usePathname } from "@/i18n/navigation";
import { GymCard } from "./GymCard";

type GymListProps = {
  gyms: GymSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  apiSearchParams?: Record<string, string>;
};

type SearchApiResponse = GymListProps;

export function GymList({
  gyms,
  totalCount,
  page,
  pageSize,
  totalPages,
  apiSearchParams,
}: GymListProps) {
  const t = useTranslations("search");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visibleGyms, setVisibleGyms] = useState(gyms);
  const [loadedPage, setLoadedPage] = useState(page);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setVisibleGyms(gyms);
    setLoadedPage(page);
    setLoadingMore(false);
  }, [gyms, page]);

  const desktopPagination = useMemo(
    () => buildPaginationItems(page, totalPages),
    [page, totalPages]
  );

  function getPageHref(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    params.set("pageSize", String(pageSize));

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  async function handleLoadMore() {
    if (loadingMore || loadedPage >= totalPages) return;

    setLoadingMore(true);
    const params = new URLSearchParams(apiSearchParams);
    for (const [key, value] of searchParams.entries()) {
      params.set(key, value);
    }
    params.set("page", String(loadedPage + 1));
    params.set("pageSize", String(pageSize));

    try {
      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load more gyms");

      const data = (await response.json()) as SearchApiResponse;
      setVisibleGyms((current) => [...current, ...data.gyms]);
      setLoadedPage(data.page);
    } finally {
      setLoadingMore(false);
    }
  }

  if (visibleGyms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl">🏋️</p>
        <p className="mt-3 text-base font-medium text-gray-900">
          {t("noResults")}
        </p>
        <p className="mt-1 text-sm text-gray-500">{t("noResultsSub")}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <p className="mb-4 text-sm text-gray-500">
        {totalCount === 1
          ? t("gymsFound", { count: totalCount })
          : t("gymsFoundPlural", { count: totalCount })}
      </p>

      <div className="space-y-3">
        {visibleGyms.map((gym) => (
          <GymCard key={gym.id} gym={gym} />
        ))}
      </div>

      <div className="mt-6 flex justify-center md:hidden">
        {loadedPage < totalPages && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {loadingMore ? t("loadingMore") : t("loadMore")}
          </button>
        )}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label={t("pagination")}
          className="mt-8 hidden items-center justify-center gap-2 md:flex"
        >
          <Link
            href={getPageHref(page - 1)}
            aria-disabled={page === 1}
            className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              page === 1
                ? "pointer-events-none border-gray-200 text-gray-300"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t("previous")}
          </Link>

          {desktopPagination.map((item, index) =>
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
            aria-disabled={page === totalPages}
            className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              page === totalPages
                ? "pointer-events-none border-gray-200 text-gray-300"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t("next")}
          </Link>
        </nav>
      )}
    </div>
  );
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
