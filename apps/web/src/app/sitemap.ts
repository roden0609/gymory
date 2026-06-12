import type { MetadataRoute } from "next";
import { EQUIPMENT_BRANDS } from "@gymory/shared";
import { createClient } from "@/lib/db/supabase-server";
import { routing } from "@/i18n/routing";
import { getIndexableBrandPageSlugs } from "@/lib/db/queries/equipment-brands";
import {
  getIndexableEquipmentDistrictPagePaths,
  getIndexableEquipmentPageSlugs,
} from "@/lib/db/queries/equipment-pages";
import { getIndexableTrainingPageSlugs } from "@/lib/db/queries/training-pages";
import { DISTRICT_PAGE_DEFINITIONS } from "@/lib/district-pages";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://gymory.io";
  const supabase = await createClient();

  const { data: gyms } = await supabase
    .from("gyms")
    .select("slug, district_code, updated_at")
    .eq("is_active", true);

  const equipmentPageSlugs = await getIndexableEquipmentPageSlugs();
  const equipmentDistrictPaths = await getIndexableEquipmentDistrictPagePaths(
    DISTRICT_PAGE_DEFINITIONS
  );
  const trainingPageSlugs = await getIndexableTrainingPageSlugs();
  const brandPageSlugs = await getIndexableBrandPageSlugs(
    EQUIPMENT_BRANDS.map((brand) => brand.slug)
  );

  const localizedUrls = routing.locales.flatMap((locale) => {
    const localeBaseUrl = `${baseUrl}/${locale}`;
    const gymUrls = (gyms ?? []).map((gym) => ({
      url: `${localeBaseUrl}/gyms/${gym.slug}`,
      lastModified: gym.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    const equipmentUrls = equipmentPageSlugs.map((slug) => ({
      url: `${localeBaseUrl}/equipment/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    const equipmentDistrictUrls = equipmentDistrictPaths.map((path) => ({
      url: `${localeBaseUrl}/gyms/${path.district}/${path.equipment}`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));
    const activeDistrictCodes = new Set(
      (gyms ?? []).map((gym) => gym.district_code).filter(Boolean)
    );
    const districtUrls = DISTRICT_PAGE_DEFINITIONS.filter((district) =>
      activeDistrictCodes.has(district.code)
    ).map((district) => ({
      url: `${localeBaseUrl}/districts/${district.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    const trainingUrls = trainingPageSlugs.map((slug) => ({
      url: `${localeBaseUrl}/gyms/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));
    const brandUrls = brandPageSlugs.map((slug) => ({
      url: `${localeBaseUrl}/brands/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

    return [
      { url: localeBaseUrl, changeFrequency: "daily" as const, priority: 1 },
      {
        url: `${localeBaseUrl}/search`,
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      {
        url: `${localeBaseUrl}/gyms`,
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      {
        url: `${localeBaseUrl}/submit`,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      },
      {
        url: `${localeBaseUrl}/contributors`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      },
      ...trainingUrls,
      ...districtUrls,
      ...equipmentUrls,
      ...equipmentDistrictUrls,
      ...brandUrls,
      ...gymUrls,
    ];
  });

  return localizedUrls;
}
