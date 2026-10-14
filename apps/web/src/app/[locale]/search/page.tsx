import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchExperience } from "@/components/search/SearchExperience";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";
import { buildListingSeoMetadata } from "@/lib/listing-seo";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: RawSearchParams;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return buildListingSeoMetadata({
    locale,
    path: "/search",
    searchParams,
    title: t("title"),
    description: "Search nearby gyms by equipment, location, and size.",
  });
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: RawSearchParams & { flash?: string; view?: string };
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
