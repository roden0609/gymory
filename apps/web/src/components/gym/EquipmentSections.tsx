"use client";

import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

const ExpansionContext = createContext({ expanded: false, revision: 0 });

export function EquipmentSections({ children }: { children: ReactNode }) {
  const t = useTranslations("gym");
  const [expansion, setExpansion] = useState({ expanded: false, revision: 0 });

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const update = () => setExpansion((current) => ({
      expanded: desktop.matches, revision: current.revision + 1,
    }));
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);

  return (
    <ExpansionContext.Provider value={expansion}>
      <div className="flex min-w-0 flex-wrap justify-end gap-3 border-b border-gray-100 py-3">
        {[true, false].map((expanded) => (
          <button key={String(expanded)} type="button"
            className="min-h-11 max-w-full break-words rounded px-2 text-sm font-medium text-gray-600 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-900"
            onClick={() => setExpansion((current) => ({ expanded, revision: current.revision + 1 }))}>
            {t(expanded ? "expandAllEquipment" : "collapseAllEquipment")}
          </button>
        ))}
      </div>
      {children}
    </ExpansionContext.Provider>
  );
}

export function EquipmentSection({ title, count, collapsible, summary, children }: {
  title: string;
  count: number;
  collapsible: boolean;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("gym");
  const expansion = useContext(ExpansionContext);
  const [override, setOverride] = useState<{ expanded: boolean; revision: number } | null>(null);
  const expanded = override?.revision === expansion.revision ? override.expanded : expansion.expanded;
  const contentId = useId();

  return (
    <section className="min-w-0 border-b border-gray-100 py-6 last:border-0">
      <h2 className="min-w-0 text-lg font-semibold text-gray-900">
        {collapsible ? (
          <button type="button" aria-expanded={expanded} aria-controls={contentId}
            className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-900"
            onClick={() => setOverride({ expanded: !expanded, revision: expansion.revision })}>
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{title}
              <span className="ml-2 text-sm font-normal text-gray-500">{t("equipmentTypeCount", { count })}</span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-gray-500">{expanded ? "▴" : "▾"}</span>
          </button>
        ) : title}
      </h2>
      {collapsible && !expanded && summary && (
        <div className="mt-3 min-w-0" data-equipment-summary>{summary}</div>
      )}
      <div id={contentId} hidden={collapsible && !expanded} className="mt-4 min-w-0">{children}</div>
    </section>
  );
}
