import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HK_DISTRICTS, getHkDistrictLabel } from "@gymory/shared";
import { GymCard } from "@/components/search/GymCard";
import { Link } from "@/i18n/navigation";
import { getDistrictPageDefinitionByCode } from "@/lib/district-pages";
import {
  EQUIPMENT_PAGE_DEFINITIONS,
  getEquipmentPageDefinition,
  getEquipmentSearchQuery,
} from "@/lib/equipment-pages";
import { getGymsForEquipmentPage } from "@/lib/db/queries/equipment-pages";
import { buildSeoMetadata } from "@/lib/seo";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale; equipment: string }>;
};

export function generateStaticParams() {
  return EQUIPMENT_PAGE_DEFINITIONS.map((definition) => ({
    equipment: definition.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, equipment } = await params;
  const definition = getEquipmentPageDefinition(equipment);
  if (!definition) return {};

  const t = await getTranslations({ locale, namespace: "equipmentPages" });
  return buildSeoMetadata({
    locale,
    path: `/equipment/${definition.slug}`,
    title: t(`items.${definition.slug}.title`),
    description: t(`items.${definition.slug}.description`),
  });
}

export default async function EquipmentLandingPage({ params }: Props) {
  const { locale, equipment } = await params;
  setRequestLocale(locale);

  const definition = getEquipmentPageDefinition(equipment);
  if (!definition) notFound();

  const t = await getTranslations("equipmentPages");
  const common = await getTranslations("common");
  const result = await getGymsForEquipmentPage(definition);
  const searchQuery = getEquipmentSearchQuery(definition);
  const searchHref = searchQuery ? `/search?${searchQuery}` : "/search";
  const gymsWithCoordinates = result.gyms.filter(
    (gym) => gym.lat !== null && gym.lng !== null
  ).length;
  const verifiedGyms = result.gyms.filter((gym) => gym.is_verified).length;
  const districtCounts = HK_DISTRICTS.map((district) => ({
    code: district.code,
    label: getHkDistrictLabel(district.code, locale),
    count: result.gyms.filter((gym) => gym.district_code === district.code).length,
  })).filter((district) => district.count > 0);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Link
                href="/search"
                className="text-sm text-gray-500 transition-colors hover:text-gray-900"
              >
                {common("back")}
              </Link>
              <h1 className="mt-4 text-3xl font-bold text-gray-900">
                {t(`items.${definition.slug}.h1`)}
              </h1>
              <p className="mt-3 text-base leading-7 text-gray-600">
                {t(`items.${definition.slug}.intro`)}
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
          <Stat label={t("verifiedGyms")} value={verifiedGyms} />
          <Stat label={t("mappedGyms")} value={gymsWithCoordinates} />
        </section>

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">{t("criteria")}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {t(`items.${definition.slug}.criteria`)}
          </p>
          <p className="mt-3 text-sm text-gray-500">{t("communityNote")}</p>
        </section>

        {districtCounts.length > 0 && (
          <section className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {t("districts")}
              </span>
              {districtCounts.map((district) => {
                const districtPage = getDistrictPageDefinitionByCode(district.code);
                return (
                  <Link
                    key={district.code}
                    href={
                      districtPage
                        ? `/gyms/${districtPage.slug}/${definition.slug}`
                        : searchHref
                    }
                    className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400"
                  >
                    {district.label} · {district.count}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t("gymListTitle")}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t("gymListSubtitle")}
              </p>
            </div>
          </div>

          {result.gyms.length > 0 ? (
            <div className="space-y-3">
              {result.gyms.map((gym) => (
                <GymCard key={gym.id} gym={gym} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="font-medium text-gray-900">{t("noResults")}</p>
              <p className="mt-2 text-sm text-gray-500">{t("noResultsSub")}</p>
              <Link
                href="/submit"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                {t("submitEquipment")}
              </Link>
            </div>
          )}
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
