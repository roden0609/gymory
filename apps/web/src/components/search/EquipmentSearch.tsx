"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { EquipmentCategoryFilterOption } from "@/lib/db/queries/equipment-catalog-search";

export function EquipmentSearch({
  basePath,
  equipmentCategories,
}: {
  basePath: string;
  equipmentCategories: EquipmentCategoryFilterOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("search");
  const [machine, setMachine] = useState(searchParams.get("machine") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [machineDirty, setMachineDirty] = useState(false);

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

  return (
    <section className="min-w-0 max-w-full">
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{t("equipmentSearch")}</h2>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        <select
          aria-label={t("equipmentCategory")}
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setMachineDirty(false);
            applySearch(machine, event.target.value);
          }}
          className="h-9 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900"
        >
          <option value="">{t("anyEquipmentCategory")}</option>
          {equipmentCategories.map((option) => (
            <option key={option.slug} value={option.slug}>{option.name}</option>
          ))}
        </select>
        <input
          aria-label={t("machine")}
          type="search"
          maxLength={200}
          value={machine}
          onChange={(event) => {
            setMachine(event.target.value);
            setMachineDirty(true);
          }}
          placeholder={t("machinePlaceholder")}
          className="h-9 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400"
        />
      </div>
    </section>
  );
}
