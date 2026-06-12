import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BackButton } from "@/components/common/BackButton";
import { GymList } from "@/components/search/GymList";
import { SearchFilters } from "@/components/search/SearchFilters";
import { Link } from "@/i18n/navigation";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";
import { createClient } from "@/lib/db/supabase-server";
import {
  DISTRICT_PAGE_DEFINITIONS,
  getDistrictPageDefinition,
  getDistrictPageLabel,
} from "@/lib/district-pages";
import { EQUIPMENT_PAGE_DEFINITIONS } from "@/lib/equipment-pages";
import { buildSeoMetadata } from "@/lib/seo";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const district = getDistrictPageDefinition(slug);
  if (!district) return {};

  const t = await getTranslations({ locale, namespace: "districtPages" });
  const result = await searchGyms({
    district: district.code,
    pageSize: "1",
  });
  const districtName = getDistrictPageLabel(district, locale);

  return buildSeoMetadata({
    locale,
    path: `/districts/${district.slug}`,
    title: t("title", { district: districtName }),
    description: t("description", {
      district: districtName,
      count: result.totalCount,
    }),
    robots: result.totalCount === 0 ? { index: false, follow: true } : undefined,
  });
}

export default async function DistrictLandingPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const district = getDistrictPageDefinition(slug);
  if (!district) notFound();

  const t = await getTranslations("districtPages");
  const equipmentPages = await getTranslations("equipmentPages");
  const common = await getTranslations("common");
  const districtName = getDistrictPageLabel(district, locale);
  const result = await searchGyms({
    ...searchParams,
    district: district.code,
  });
  const stats = await getDistrictStats(district.code);
  const searchHref = `/search?district=${encodeURIComponent(district.code)}`;
  const featuredEquipment = EQUIPMENT_PAGE_DEFINITIONS.slice(0, 6);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <BackButton
                fallbackHref="/search"
                className="text-sm text-gray-500 transition-colors hover:text-gray-900"
              >
                {common("back")}
              </BackButton>
              <h1 className="mt-4 text-3xl font-bold text-gray-900">
                {t("h1", { district: districtName })}
              </h1>
              <p className="mt-3 text-base leading-7 text-gray-600">
                {t("intro", {
                  district: districtName,
                  count: result.totalCount,
                })}
              </p>
            </div>
            <Link
              href={searchHref}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              {t("openInSearch")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <Stat label={t("matchedGyms")} value={result.totalCount} />
          <Stat label={t("verifiedGyms")} value={stats.verifiedCount} />
          <Stat label={t("mappedGyms")} value={stats.mappedCount} />
        </section>

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t("equipmentTitle", { district: districtName })}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {t("equipmentIntro", { district: districtName })}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {featuredEquipment.map((definition) => (
              <Link
                key={definition.slug}
                href={`/gyms/${district.slug}/${definition.slug}`}
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
              >
                {equipmentPages(`items.${definition.slug}.shortName`)}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {t("gymListTitle", { district: districtName })}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{t("gymListSubtitle")}</p>
          </div>
          <div className="flex flex-col gap-6 md:flex-row">
            <SearchFilters
              basePath={`/districts/${district.slug}`}
              fixedDistrict={district.code}
              hideDistrictSelect
            />
            <GymList
              {...result}
              apiSearchParams={{
                district: district.code,
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

async function getDistrictStats(districtCode: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gyms")
    .select("is_verified, lat, lng")
    .eq("is_active", true)
    .eq("district_code", districtCode);

  return {
    verifiedCount: (data ?? []).filter((gym) => gym.is_verified).length,
    mappedCount: (data ?? []).filter(
      (gym) => gym.lat !== null && gym.lng !== null
    ).length,
  };
}
