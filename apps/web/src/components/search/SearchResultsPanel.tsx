"use client";

import { useSearchNavigation } from "./SearchNavigation";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import type { PaginatedGymSearchResult } from "@/lib/db/queries/search-gyms";
import { GymList } from "./GymList";

const GymMap = dynamic(() => import("./GymMap").then((mod) => mod.GymMap), {
  ssr: false,
  loading: () => (
    <div className="h-[62vh] min-h-[420px] w-full max-w-full animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-gray-100" />
  ),
});

type ViewMode = "list" | "map" | "split";

function parseViewMode(value: string | null): ViewMode {
  if (value === "map" || value === "split") return value;
  return "list";
}

function cx(...classes: Array<string | false>) {
  return classes.filter(Boolean).join(" ");
}

export function SearchResultsPanel({
  result,
  initialView,
  apiSearchParams,
}: {
  result: PaginatedGymSearchResult;
  initialView: string | undefined;
  apiSearchParams?: Record<string, string>;
}) {
  const t = useTranslations("search");
  const navigation = useSearchNavigation();
  const { searchParams, navigate } = navigation;
  const committedPathname = usePathname();
  const pathname = navigation.target?.pathname ?? committedPathname;
  const currentView = parseViewMode(searchParams.get("view") ?? (navigation.target ? null : initialView) ?? null);

  const updateView = useCallback(
    (nextView: ViewMode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextView === "list") {
        params.delete("view");
      } else {
        params.set("view", nextView);
      }
      const query = params.toString();
      navigate(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, navigate, searchParams]
  );

  const controls = useMemo(
    () => [
      { key: "list" as const, label: t("viewList") },
      { key: "map" as const, label: t("viewMap") },
      { key: "split" as const, label: t("viewSplit") },
    ],
    [t]
  );

  return (
    <div className="min-w-0 max-w-full flex-1 space-y-4 overflow-hidden">
      <div className="flex w-full min-w-0 rounded-lg border border-gray-300 bg-white p-1 sm:inline-flex sm:w-auto">
        {controls.map((control) => {
          const active = currentView === control.key;
          return (
            <button
              key={control.key}
              type="button"
              onClick={() => updateView(control.key)}
              className={cx(
                "min-w-0 flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              {control.label}
            </button>
          );
        })}
      </div>

      <div className={navigation.isPending || navigation.failed ? "min-w-0 text-sm" : "sr-only"} role="status" aria-live="polite" aria-atomic="true">
        {navigation.isPending ? (
          <span className="inline-flex max-w-full items-center gap-2 text-gray-600">
            <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 motion-reduce:animate-none" />
            <span className="min-w-0 break-words">{t("updatingResults")}</span>
          </span>
        ) : navigation.failed ? (
          <span className="flex flex-wrap items-center gap-2 text-red-700">
            <span>{t("updateResultsFailed")}</span>
            <button type="button" onClick={navigation.retry} className="min-h-9 rounded px-2 font-medium underline">{t("retryResults")}</button>
          </span>
        ) : null}
      </div>
      <div aria-busy={navigation.isPending} className="min-w-0 max-w-full space-y-4">
        {currentView === "list" ? (
          <GymList
            {...result}
            apiSearchParams={apiSearchParams}
            resultSource="search_results"
          />
        ) : null}

        {currentView === "map" ? (
          <GymMap gyms={result.gyms} onFallbackToList={() => updateView("list")} />
        ) : null}

        {currentView === "split" ? (
          <div className="grid min-w-0 max-w-full gap-4 overflow-hidden lg:grid-cols-2">
            <GymList
              {...result}
              apiSearchParams={apiSearchParams}
              resultSource="search_results"
            />
            <GymMap gyms={result.gyms} onFallbackToList={() => updateView("list")} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
