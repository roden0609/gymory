"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useTranslations } from "next-intl";

import { SearchNavigationProvider, useSearchNavigation } from "./SearchNavigation";

type FilterActions = { count: number; clear: () => void };
const FilterActionsContext = createContext<Dispatch<SetStateAction<FilterActions | null>> | null>(null);

export function useSearchFilterActions() {
  return useContext(FilterActionsContext);
}

function SearchFilterToolbar({ actions }: { actions: FilterActions | null }) {
  const t = useTranslations("search");
  const { isPending } = useSearchNavigation();

  if (!isPending && !actions?.count) return null;

  return (
    <div className="mb-3 flex min-h-10 min-w-0 items-center justify-between gap-2">
      {/* The results panel already announces updates to assistive technology. */}
      <span aria-hidden="true" className="inline-flex min-w-0 items-center gap-2 text-sm text-gray-600">
        {isPending ? (
          <>
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 motion-reduce:animate-none" />
            <span className="min-w-0 break-words">{t("updatingFilters")}</span>
          </>
        ) : null}
      </span>
      {actions && actions.count > 0 ? (
        <button type="button" onClick={actions.clear}
          className="min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 underline underline-offset-4 transition-colors hover:bg-gray-100 hover:text-gray-900">
          {t("clearFilters")}
        </button>
      ) : null}
    </div>
  );
}

export function SearchFilterLayout({ children, controls, navigation }: { children: ReactNode; controls?: ReactNode; navigation?: ReactNode }) {
  const [actions, setActions] = useState<FilterActions | null>(null);

  return (
    <SearchNavigationProvider>
      <FilterActionsContext.Provider value={setActions}>
        <div className="min-w-0 max-w-full">
          {navigation}
          <SearchFilterToolbar actions={actions} />
          {controls}
          <div className="flex min-w-0 flex-col gap-6 md:flex-row">{children}</div>
        </div>
      </FilterActionsContext.Provider>
    </SearchNavigationProvider>
  );
}
