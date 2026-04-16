"use client";

import { useTranslations } from "next-intl";
import type { GymSummary } from "@gymory/shared";
import { GymCard } from "./GymCard";

interface GymListProps {
  gyms: GymSummary[];
  totalCount?: number;
}

export function GymList({ gyms, totalCount }: GymListProps) {
  const t = useTranslations("search");
  const count = totalCount ?? gyms.length;

  if (gyms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl">🏋️</p>
        <p className="mt-3 text-base font-medium text-gray-900">{t("noResults")}</p>
        <p className="mt-1 text-sm text-gray-500">{t("noResultsSub")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-500 mb-4">
        {count === 1 ? t("gymsFound", { count }) : t("gymsFoundPlural", { count })}
      </p>
      <div className="space-y-3">
        {gyms.map((gym) => (
          <GymCard key={gym.id} gym={gym} />
        ))}
      </div>
    </div>
  );
}
