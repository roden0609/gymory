"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { EquipmentCategoryFilterOption, EquipmentMachineSuggestion } from "@/lib/db/queries/equipment-catalog-search";

export function EquipmentSearch({
  basePath,
  equipmentCategories,
  machineSuggestions,
}: {
  basePath: string;
  equipmentCategories: EquipmentCategoryFilterOption[];
  machineSuggestions: EquipmentMachineSuggestion[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("search");
  const [machine, setMachine] = useState(searchParams.get("machine") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [machineDirty, setMachineDirty] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestions = useMemo(() => {
    const term = machine.trim().toLocaleLowerCase();
    if (!term) return [];
    return machineSuggestions
      .filter(({ label }) => label.toLocaleLowerCase().includes(term))
      .sort((a, b) =>
        Number(b.label.toLocaleLowerCase().startsWith(term)) -
        Number(a.label.toLocaleLowerCase().startsWith(term))
      )
      .slice(0, 8);
  }, [machine, machineSuggestions]);

  const applySearch = useCallback((nextMachine: string, nextCategory: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("pageSize");
    if (nextMachine.trim()) params.set("machine", nextMachine.trim());
    else params.delete("machine");
    if (nextCategory) params.set("category", nextCategory);
    else params.delete("category");
    router.replace(params.size ? `${basePath}?${params}` : basePath, { scroll: false });
  }, [basePath, router, searchParams]);

  useEffect(() => {
    setMachine(searchParams.get("machine") ?? "");
    setCategory(searchParams.get("category") ?? "");
    setMachineDirty(false);
  }, [searchParams]);

  useEffect(() => {
    if (!machineDirty) return;
    const timer = window.setTimeout(() => applySearch(machine, category), 300);
    return () => window.clearTimeout(timer);
  }, [applySearch, category, machine, machineDirty]);

  const chooseSuggestion = (suggestion: EquipmentMachineSuggestion) => {
    setMachine(suggestion.machineName);
    setMachineDirty(false);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    applySearch(suggestion.machineName, category);
  };

  return (
    <section className="min-w-0 max-w-full">
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{t("equipmentSearch")}</h2>
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="relative min-w-0 max-w-full">
          <select
            aria-label={t("equipmentCategory")}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setMachineDirty(false);
              applySearch(machine, event.target.value);
            }}
            className="h-9 w-full min-w-0 max-w-full appearance-none rounded-lg border border-gray-300 bg-white py-1.5 pl-3 pr-10 text-sm text-gray-900"
          >
            <option value="">{t("anyEquipmentCategory")}</option>
            {equipmentCategories.map((option) => (
              <option key={option.slug} value={option.slug}>{option.name}</option>
            ))}
          </select>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600">
            <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="relative min-w-0 max-w-full">
          <input
            aria-label={t("machine")}
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && suggestions.length > 0}
            aria-controls="equipment-machine-suggestions"
            aria-activedescendant={activeSuggestion >= 0 ? `equipment-machine-suggestion-${activeSuggestion}` : undefined}
            role="combobox"
            type="search"
            autoComplete="off"
            maxLength={200}
            value={machine}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => {
              setSuggestionsOpen(false);
              setActiveSuggestion(-1);
            }}
            onChange={(event) => {
              setMachine(event.target.value);
              setMachineDirty(true);
              setSuggestionsOpen(true);
              setActiveSuggestion(-1);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setSuggestionsOpen(false);
                setActiveSuggestion(-1);
              } else if (suggestions.length && event.key === "ArrowDown") {
                event.preventDefault();
                setSuggestionsOpen(true);
                setActiveSuggestion((index) => (index + 1) % suggestions.length);
              } else if (suggestions.length && event.key === "ArrowUp") {
                event.preventDefault();
                setSuggestionsOpen(true);
                setActiveSuggestion((index) => index <= 0 ? suggestions.length - 1 : index - 1);
              } else if (event.key === "Enter" && suggestionsOpen && activeSuggestion >= 0) {
                event.preventDefault();
                chooseSuggestion(suggestions[activeSuggestion]);
              }
            }}
            placeholder={t("machinePlaceholder")}
            className="h-9 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400"
          />
          {suggestionsOpen && suggestions.length > 0 ? (
            <ul id="equipment-machine-suggestions" role="listbox" className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.machineName}:${suggestion.label}`} id={`equipment-machine-suggestion-${index}`} role="option" aria-selected={index === activeSuggestion} className="min-w-0">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseSuggestion(suggestion)}
                    className={`w-full min-w-0 break-words px-3 py-2 text-left text-sm [overflow-wrap:anywhere] hover:bg-gray-100 ${index === activeSuggestion ? "bg-gray-100" : ""}`}
                  >
                    {suggestion.label}
                    {suggestion.label !== suggestion.machineName ? (
                      <span className="ml-2 text-xs text-gray-500">{suggestion.machineName}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
