"use client";

import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

export function EquipmentFilterForm({ children, locale }: { children: ReactNode; locale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const composing = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    for (const name of ["brand", "equipmentType", "status", "name", "model"]) {
      const field = formRef.current?.elements.namedItem(name);
      if ((field instanceof HTMLInputElement || field instanceof HTMLSelectElement) && field !== document.activeElement) {
        field.value = searchParams.get(name) ?? "";
      }
    }
  }, [searchParams]);
  const [pending, startTransition] = useTransition();

  function applyFilters(form: HTMLFormElement) {
    clearTimeout(timer.current);
    const data = new FormData(form);
    const query = new URLSearchParams();
    for (const name of ["brand", "equipmentType", "status", "name", "model"]) {
      const value = String(data.get(name) ?? "").trim();
      if (value) query.set(name, value);
    }
    startTransition(() => router.replace(query.size ? `/admin/equipment?${query}` : "/admin/equipment", { scroll: false }));
  }

  function scheduleSearch(form: HTMLFormElement) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => applyFilters(form), 300);
  }

  return <form ref={formRef} aria-busy={pending} onSubmit={(event) => {
    event.preventDefault();
    applyFilters(event.currentTarget);
  }} onChange={(event) => {
    if (event.target instanceof HTMLSelectElement) applyFilters(event.currentTarget);
    else if (!composing.current) scheduleSearch(event.currentTarget);
  }} onCompositionStart={() => {
    composing.current = true;
    clearTimeout(timer.current);
  }} onCompositionEnd={(event) => {
    composing.current = false;
    scheduleSearch(event.currentTarget);
  }}
    className="min-w-0 rounded-lg border border-gray-200 bg-white p-4">
    <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </fieldset>
    <p role="status" className="text-sm text-gray-500">{pending ? (locale === "zh-HK" ? "更新中…" : "Updating…") : null}</p>
  </form>;
}
