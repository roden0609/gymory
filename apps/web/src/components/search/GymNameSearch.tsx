"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchNavigation } from "./SearchNavigation";

export function GymNameSearch({ basePath }: { basePath: string }) {
  const { searchParams, navigate, target } = useSearchNavigation();
  const t = useTranslations("search");
  const committedValue = searchParams.get("gymName") ?? "";
  const [draft, setDraft] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const pathname = target?.pathname ?? basePath;

  useEffect(() => {
    if (draft === null || isComposing) return;

    const timer = window.setTimeout(() => {
      const term = draft.trim();
      if (term !== committedValue) {
        const params = new URLSearchParams(searchParams);
        params.delete("page");
        params.delete("pageSize");
        if (term) params.set("gymName", term);
        else params.delete("gymName");
        navigate(params.size ? `${pathname}?${params}` : pathname, { replace: true });
      }
      setDraft(null);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [committedValue, draft, isComposing, navigate, pathname, searchParams]);

  return (
    <label className="block min-w-0 max-w-full">
      <span className="mb-2 block text-sm font-semibold text-gray-900">{t("gymName")}</span>
      <input
        type="search"
        maxLength={200}
        value={draft ?? committedValue}
        onChange={(event) => setDraft(event.target.value)}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={(event) => {
          setDraft(event.currentTarget.value);
          setIsComposing(false);
        }}
        placeholder={t("gymNamePlaceholder")}
        className="h-9 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400"
      />
    </label>
  );
}
