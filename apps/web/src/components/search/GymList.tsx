"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import type { GymSummary } from "@gymory/shared";
import { Link, usePathname } from "@/i18n/navigation";
import type { ResultClickSource } from "@/lib/analytics";
import { useSearchNavigation } from "./SearchNavigation";
import { GymCard } from "./GymCard";

type GymListProps = {
  gyms: GymSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  apiSearchParams?: Record<string, string>;
  resultSource?: ResultClickSource;
};

type SearchApiResponse = GymListProps;

export function GymList({
  gyms,
  totalCount,
  page,
  pageSize,
  totalPages,
  apiSearchParams,
  resultSource = "search_results",
}: GymListProps) {
  const t = useTranslations("search");
  const pathname = usePathname();
  const navigation = useSearchNavigation();
  const { searchParams, navigate } = navigation;
  const [visibleGyms, setVisibleGyms] = useState(gyms);
  const [loadedPage, setLoadedPage] = useState(page);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadRequest = useRef<AbortController | null>(null);
  const searchKey = searchParams.toString();

  useEffect(() => {
    loadRequest.current?.abort();
    loadRequest.current = null;
    setLoadingMore(false);
    setLoadError(false);
    return () => { loadRequest.current?.abort(); loadRequest.current = null; };
  }, [searchKey, navigation.isPending]);

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

  function navigatePage(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.currentTarget.getAttribute("aria-disabled") === "true") { event.preventDefault(); return; }
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href, { scroll: true });
  }

  async function handleLoadMore() {
    if (loadRequest.current || navigation.isPending || loadedPage >= totalPages) return;
    const controller = new AbortController();
    loadRequest.current = controller;
    setLoadError(false);

    setLoadingMore(true);
    const params = new URLSearchParams(apiSearchParams);
    for (const [key, value] of searchParams.entries()) {
      if (key === "collection" && apiSearchParams?.collection) continue;
      if ((key === "district" || key === "districts") && apiSearchParams?.district) continue;
      if (key === "gymChains" && apiSearchParams?.gymChains) continue;
      params.set(key, value);
    }
    params.set("page", String(loadedPage + 1));
    params.set("pageSize", String(pageSize));

    try {
      const response = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Failed to load more gyms");

      const data = (await response.json()) as SearchApiResponse;
      if (controller.signal.aborted || loadRequest.current !== controller) return;
      setVisibleGyms((current) => [...current, ...data.gyms]);
      setLoadedPage(data.page);
    } catch {
      if (!controller.signal.aborted && loadRequest.current === controller) setLoadError(true);
    } finally {
      if (loadRequest.current === controller) {
        loadRequest.current = null;
        setLoadingMore(false);
      }
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
        {visibleGyms.map((gym, index) => (
          <GymCard
            key={gym.id}
            gym={gym}
            resultPosition={index + 1}
            resultSource={resultSource}
          />
        ))}
      </div>

      {loadError ? <p role="alert" className="mt-4 text-sm text-red-700">{t("loadMoreFailed")}</p> : null}
      <div className="mt-6 flex justify-center md:hidden">
        {loadedPage < totalPages && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore || navigation.isPending}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {loadingMore ? <span aria-hidden="true" className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 motion-reduce:animate-none" /> : null}
            {loadingMore ? t("loadingMore") : loadError ? t("retryResults") : t("loadMore")}
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
            onClick={(event) => navigatePage(event, getPageHref(page - 1))}
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
            onClick={(event) => navigatePage(event, getPageHref(item))}
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
            onClick={(event) => navigatePage(event, getPageHref(page + 1))}
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
