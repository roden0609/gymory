import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchExperience } from "@/components/search/SearchExperience";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";
import {
  DISTRICT_PAGE_DEFINITIONS,
  getDistrictPageDefinition,
  getDistrictPageLabel,
} from "@/lib/district-pages";
import { buildListingSeoMetadata } from "@/lib/listing-seo";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: RawSearchParams;
};

export function generateStaticParams() {
  return DISTRICT_PAGE_DEFINITIONS.map((district) => ({
    slug: district.slug,
  }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const district = getDistrictPageDefinition(slug);
  if (!district) return {};

  const t = await getTranslations({ locale, namespace: "districtPages" });
  const result = await searchGyms({
    district: district.code,
    pageSize: "1",
  });
  const districtName = getDistrictPageLabel(district, locale);

  return buildListingSeoMetadata({
    locale,
    path: `/districts/${district.slug}`,
    title: t("title", { district: districtName }),
    description: t("description", {
      district: districtName,
      count: result.totalCount,
    }),
    searchParams,
    empty: result.totalCount === 0,
  });
}

export default async function DistrictLandingPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const district = getDistrictPageDefinition(slug);
  if (!district) notFound();

  const result = await searchGyms({
    ...searchParams,
    district: district.code,
  });

  return (
    <SearchExperience
      locale={locale}
      result={result}
      searchParams={{
        ...searchParams,
        district: district.code,
      }}
      filterBasePath={`/districts/${district.slug}`}
      fixedDistrict={district.code}
    />
  );
}
