"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { PaginatedGymSearchResult } from "@/lib/db/queries/search-gyms";
import { GymList } from "./GymList";

const GymMap = dynamic(() => import("./GymMap").then((mod) => mod.GymMap), {
  ssr: false,
  loading: () => (
    <div className="h-[62vh] min-h-[420px] w-full animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
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
}: {
  result: PaginatedGymSearchResult;
  initialView: string | undefined;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = parseViewMode(searchParams.get("view") ?? initialView ?? null);

  const updateView = useCallback(
    (nextView: ViewMode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextView === "list") {
        params.delete("view");
      } else {
        params.set("view", nextView);
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
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
    <div className="min-w-0 flex-1 space-y-4">
      <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
        {controls.map((control) => {
          const active = currentView === control.key;
          return (
            <button
              key={control.key}
              type="button"
              onClick={() => updateView(control.key)}
              className={cx(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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

      {currentView === "list" ? <GymList {...result} /> : null}

      {currentView === "map" ? (
        <GymMap gyms={result.gyms} onFallbackToList={() => updateView("list")} />
      ) : null}

      {currentView === "split" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GymList {...result} />
          <GymMap gyms={result.gyms} onFallbackToList={() => updateView("list")} />
        </div>
      ) : null}
    </div>
  );
}
