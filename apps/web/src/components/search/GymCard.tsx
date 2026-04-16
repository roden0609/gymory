"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import type { GymSummary } from "@gymory/shared";
import { getHkDistrictLabel } from "@gymory/shared";

function EquipmentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      {label}
    </span>
  );
}

export function GymCard({ gym }: { gym: GymSummary }) {
  const locale = useLocale() as "en" | "zh-HK";
  const displayName = locale === "zh-HK" && gym.name_zh ? gym.name_zh : gym.name;
  const displayAddress =
    locale === "zh-HK" && gym.address_zh ? gym.address_zh : gym.address;
  const districtLabel = getHkDistrictLabel(gym.district_code, locale);
  const equipmentHighlights: string[] = [];

  if (gym.rack_count > 0) equipmentHighlights.push(`${gym.rack_count} rack${gym.rack_count > 1 ? "s" : ""}`);
  if (gym.dumbbell_max_weight_kg) equipmentHighlights.push(`DB up to ${gym.dumbbell_max_weight_kg}kg`);
  if (gym.plate_max_weight_kg) equipmentHighlights.push(`Plates up to ${gym.plate_max_weight_kg}kg`);
  if (gym.assault_bike_count > 0) equipmentHighlights.push("Assault bike");
  if (gym.ski_erg_count > 0) equipmentHighlights.push("Ski erg");
  if (gym.rower_count > 0) equipmentHighlights.push("Rower");
  if (gym.sled_count > 0) equipmentHighlights.push("Sled");
  if (gym.wall_ball_count > 0) equipmentHighlights.push("Wall ball");

  return (
    <Link
      href={`/gyms/${gym.slug}`}
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-400 hover:shadow-sm transition-all"
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
    </Link>
  );
}
