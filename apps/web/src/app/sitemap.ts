import type { MetadataRoute } from "next";
import { createClient } from "@/lib/db/supabase-server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://gymory.io";
  const supabase = await createClient();

  const { data: gyms } = await supabase
    .from("gyms")
    .select("slug, updated_at")
    .eq("is_active", true);

  const gymUrls = (gyms ?? []).map((gym) => ({
    url: `${baseUrl}/gyms/${gym.slug}`,
    lastModified: gym.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/submit`, changeFrequency: "monthly", priority: 0.5 },
    ...gymUrls,
  ];
}
