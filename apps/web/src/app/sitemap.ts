import type { MetadataRoute } from "next";
import { createClient } from "@/lib/db/supabase-server";
import { routing } from "@/i18n/routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://gymory.io";
  const supabase = await createClient();

  const { data: gyms } = await supabase
    .from("gyms")
    .select("slug, updated_at")
    .eq("is_active", true);

  const localizedUrls = routing.locales.flatMap((locale) => {
    const localeBaseUrl = `${baseUrl}/${locale}`;
    const gymUrls = (gyms ?? []).map((gym) => ({
      url: `${localeBaseUrl}/gyms/${gym.slug}`,
      lastModified: gym.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
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
      ...gymUrls,
    ];
  });

  return localizedUrls;
}
