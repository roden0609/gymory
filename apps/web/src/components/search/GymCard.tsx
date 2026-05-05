"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { GymSummary } from "@gymory/shared";
import { getHkDistrictLabel } from "@gymory/shared";

function EquipmentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      {label}
    </span>
  );
}

function hasPositiveCount(count: number | null) {
  if (count === null) return null;
  return count > 0 ? count : null;
}

export function GymCard({ gym }: { gym: GymSummary }) {
  const locale = useLocale() as "en" | "zh-HK";
  const t = useTranslations("search");
  const tGym = useTranslations("gym");
  const displayName = locale === "zh-HK" && gym.name_zh ? gym.name_zh : gym.name;
  const displayAddress =
    locale === "zh-HK" && gym.address_zh ? gym.address_zh : gym.address;
  const districtLabel = getHkDistrictLabel(gym.district_code, locale);
  const equipmentHighlights: string[] = [];

  const rackCount = hasPositiveCount(gym.rack_count);
  if (rackCount) equipmentHighlights.push(t("rackBadge", { count: rackCount }));
  if (gym.dumbbell_max_weight_kg) {
    equipmentHighlights.push(
      t("dumbbellMaxBadge", { weight: gym.dumbbell_max_weight_kg })
    );
  }
  if (gym.plate_max_weight_kg) {
    equipmentHighlights.push(
      t("plateMaxBadge", { weight: gym.plate_max_weight_kg })
    );
  }
  const assaultBikeCount = hasPositiveCount(gym.assault_bike_count);
  if (assaultBikeCount) {
    equipmentHighlights.push(
      t("assaultBikeBadge", { count: assaultBikeCount })
    );
  }
  const skiErgCount = hasPositiveCount(gym.ski_erg_count);
  if (skiErgCount) equipmentHighlights.push(t("skiErgBadge", { count: skiErgCount }));
  const rowerCount = hasPositiveCount(gym.rower_count);
  if (rowerCount) equipmentHighlights.push(t("rowerBadge", { count: rowerCount }));
  const sledCount = hasPositiveCount(gym.sled_count);
  if (sledCount) equipmentHighlights.push(t("sledBadge", { count: sledCount }));
  if (
    gym.has_wall_ball ||
    (gym.wall_ball_count !== null && gym.wall_ball_count > 0) ||
    (gym.wall_ball_4kg_count !== null && gym.wall_ball_4kg_count > 0) ||
    (gym.wall_ball_6kg_count !== null && gym.wall_ball_6kg_count > 0) ||
    (gym.wall_ball_8kg_count !== null && gym.wall_ball_8kg_count > 0) ||
    (gym.wall_ball_9kg_count !== null && gym.wall_ball_9kg_count > 0)
  ) {
    equipmentHighlights.push(tGym("wallBall"));
  }

  const likeCount = gym.accuracy_like_count ?? 0;
  const dislikeCount = gym.accuracy_dislike_count ?? 0;

  return (
    <Link
      href={`/gyms/${gym.slug}`}
      className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{displayName}</h3>
          <p className="mt-0.5 text-sm text-gray-500">
            {districtLabel}
            {displayAddress ? ` · ${displayAddress}` : ""}
          </p>
        </div>

        {gym.is_verified && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-200">
            {tGym("verified")}
          </span>
        )}
      </div>

      {equipmentHighlights.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {equipmentHighlights.map((label) => (
            <EquipmentBadge key={label} label={label} />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="font-medium text-gray-600">{t("accuracyHeading")}:</span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
          👍 {likeCount}
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
          👎 {dislikeCount}
        </span>
      </div>
    </Link>
  );
}
