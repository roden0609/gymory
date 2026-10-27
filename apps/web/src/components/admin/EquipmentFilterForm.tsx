"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";

export function EquipmentFilterForm({ children, locale }: { children: ReactNode; locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return <form aria-busy={pending} onSubmit={(event) => event.preventDefault()}
    onChange={(event) => {
      const data = new FormData(event.currentTarget);
      const query = new URLSearchParams();
      for (const name of ["brand", "equipmentType", "status"]) {
        const value = String(data.get(name) ?? "");
        if (value) query.set(name, value);
      }
      startTransition(() => router.replace(query.size ? `/admin/equipment?${query}` : "/admin/equipment", { scroll: false }));
    }}
    className="min-w-0 rounded-lg border border-gray-200 bg-white p-4">
    <fieldset disabled={pending} className="grid min-w-0 gap-3 sm:grid-cols-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
      {children}
    </fieldset>
    <p role="status" className="text-sm text-gray-500">{pending ? (locale === "zh-HK" ? "更新中…" : "Updating…") : null}</p>
  </form>;
}
