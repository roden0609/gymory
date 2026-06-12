import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchExperience } from "@/components/search/SearchExperience";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  return buildSeoMetadata({
    locale,
    title: "Gymory — Find gyms with the equipment you need",
    description: t("tagline"),
  });
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: RawSearchParams & { flash?: string };
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const result = await searchGyms(searchParams);

  return (
    <SearchExperience
      locale={locale}
      result={result}
      searchParams={searchParams}
    />
  );
}
