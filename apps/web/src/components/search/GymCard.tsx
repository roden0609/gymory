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

function formatCountBadge(
  count: number | null,
  singular: string,
  plural: string = `${singular}s`
) {
  if (count === null) return null;
  return `${count} ${count === 1 ? singular : plural}`;
}

export function GymCard({ gym }: { gym: GymSummary }) {
  const locale = useLocale() as "en" | "zh-HK";
  const t = useTranslations("search");
  const displayName = locale === "zh-HK" && gym.name_zh ? gym.name_zh : gym.name;
  const displayAddress =
    locale === "zh-HK" && gym.address_zh ? gym.address_zh : gym.address;
  const districtLabel = getHkDistrictLabel(gym.district_code, locale);
  const equipmentHighlights: string[] = [];

  const rackBadge = formatCountBadge(gym.rack_count, "rack");
  if (rackBadge) equipmentHighlights.push(rackBadge);
  if (gym.dumbbell_max_weight_kg) equipmentHighlights.push(`DB up to ${gym.dumbbell_max_weight_kg}kg`);
  if (gym.plate_max_weight_kg) equipmentHighlights.push(`Plates up to ${gym.plate_max_weight_kg}kg`);
  const assaultBikeBadge = formatCountBadge(gym.assault_bike_count, "assault bike");
  if (assaultBikeBadge) equipmentHighlights.push(assaultBikeBadge);
  const skiErgBadge = formatCountBadge(gym.ski_erg_count, "ski erg");
  if (skiErgBadge) equipmentHighlights.push(skiErgBadge);
  const rowerBadge = formatCountBadge(gym.rower_count, "rower");
  if (rowerBadge) equipmentHighlights.push(rowerBadge);
  const sledBadge = formatCountBadge(gym.sled_count, "sled");
  if (sledBadge) equipmentHighlights.push(sledBadge);
  if (
    gym.has_wall_ball ||
    (gym.wall_ball_count !== null && gym.wall_ball_count > 0) ||
    (gym.wall_ball_4kg_count !== null && gym.wall_ball_4kg_count > 0) ||
    (gym.wall_ball_6kg_count !== null && gym.wall_ball_6kg_count > 0) ||
    (gym.wall_ball_9kg_count !== null && gym.wall_ball_9kg_count > 0)
  ) {
    equipmentHighlights.push("Wall ball");
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
            Verified
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
