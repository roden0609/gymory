"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useTranslations } from "next-intl";

type FilterActions = { count: number; clear: () => void };
const FilterActionsContext = createContext<Dispatch<SetStateAction<FilterActions | null>> | null>(null);

export function useSearchFilterActions() {
  return useContext(FilterActionsContext);
}

export function SearchFilterLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("search");
  const [actions, setActions] = useState<FilterActions | null>(null);

  return (
    <FilterActionsContext.Provider value={setActions}>
      <div className="min-w-0 max-w-full">
        {actions && actions.count > 0 && (
          <div className="mb-3 flex min-w-0 justify-end">
            <button type="button" onClick={actions.clear}
              className="min-h-10 max-w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-600 underline underline-offset-4 transition-colors hover:bg-gray-100 hover:text-gray-900">
              {t("clearFilters")}
            </button>
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-6 md:flex-row">{children}</div>
      </div>
    </FilterActionsContext.Provider>
  );
}
