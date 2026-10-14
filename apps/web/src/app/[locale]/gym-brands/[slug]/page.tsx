import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GYM_CHAINS } from "@gymory/shared";
import { SearchExperience } from "@/components/search/SearchExperience";
import { getGymBrandOverview } from "@/lib/db/queries/gym-brand-pages";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";
import { getGymBrand } from "@/lib/gym-brand-pages";
import { buildListingSeoMetadata } from "@/lib/listing-seo";

type Props = {
  params: Promise<{ locale: "en" | "zh-HK"; slug: string }>;
  searchParams: RawSearchParams;
};

export function generateStaticParams() {
  return GYM_CHAINS.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const brand = getGymBrand(slug);
  if (!brand) return {};
  const overview = await getGymBrandOverview(slug);
  const t = await getTranslations({ locale, namespace: "gymBrandPages" });
  const name = locale === "zh-HK" ? brand.name_zh : brand.name_en;
  return buildListingSeoMetadata({
    locale,
    path: `/gym-brands/${slug}`,
    title: t("title", { brand: name }),
    description: t("description", { brand: name, count: overview?.totalCount ?? 0 }),
    searchParams,
    empty: !overview?.totalCount,
  });
}

export default async function GymBrandLandingPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const brand = getGymBrand(slug);
  if (!brand) notFound();
  const result = await searchGyms({ ...searchParams, gymChains: slug });
  const t = await getTranslations("gymBrandPages");
  const name = locale === "zh-HK" ? brand.name_zh : brand.name_en;

  return (
    <SearchExperience
      locale={locale}
      result={result}
      searchParams={searchParams}
      filterBasePath={`/gym-brands/${slug}`}
      fixedGymChain={slug}
      introduction={<h1 className="sr-only">{t("h1", { brand: name })}</h1>}
    />
  );
}
