"use client";

import { useTranslations } from "next-intl";
import { GymBackLink } from "@/components/gym/GymBackLink";

export default function GymDetailError({ reset }: { reset: () => void }) {
  const t = useTranslations("gym");
  const common = useTranslations("common");
  return <main className="min-h-screen min-w-0 bg-gray-50 px-4 py-8">
    <div className="mx-auto max-w-5xl">
      <GymBackLink>{common("back")}</GymBackLink>
      <div role="alert" className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="break-words text-xl font-semibold text-gray-900">{t("detailLoadFailed")}</h1>
        <button type="button" onClick={reset} className="mt-4 min-h-10 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">{t("retryDetail")}</button>
      </div>
    </div>
  </main>;
}
