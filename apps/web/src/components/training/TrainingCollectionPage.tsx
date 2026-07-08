import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getGymsForTrainingPage } from "@/lib/db/queries/training-pages";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";
import {
  getDistrictPageDefinitionByCode,
  getDistrictPageLabel,
  type DistrictPageDefinition,
} from "@/lib/district-pages";
import { getEquipmentPageDefinition } from "@/lib/equipment-pages";
import {
  getTrainingPageDefinition,
  getTrainingSearchQuery,
} from "@/lib/training-pages";
import { buildSeoMetadata } from "@/lib/seo";
import { DistrictBrowseControls } from "@/components/search/DistrictBrowseControls";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResultsPanel } from "@/components/search/SearchResultsPanel";

type Locale = "en" | "zh-HK";

export async function generateTrainingCollectionMetadata({
  locale,
  training,
  district,
}: {
  locale: Locale;
  training: string;
  district?: DistrictPageDefinition;
}): Promise<Metadata> {
  const definition = getTrainingPageDefinition(training);
  if (!definition) return {};

  const t = await getTranslations({ locale, namespace: "trainingPages" });
  const result = district
    ? await searchGyms({
        collection: definition.slug,
        district: district.code,
        pageSize: "1",
      })
    : await getGymsForTrainingPage(definition);
  const districtName = district ? getDistrictPageLabel(district, locale) : null;

  return buildSeoMetadata({
    locale,
    path: district
      ? `/${definition.slug}/districts/${district.slug}`
      : `/${definition.slug}`,
    title: districtName
      ? `${t(`items.${definition.slug}.title`)} - ${districtName}`
      : t(`items.${definition.slug}.title`),
    description: t(`items.${definition.slug}.description`),
    robots: result.totalCount === 0 ? { index: false, follow: true } : undefined,
  });
}

export async function TrainingCollectionPage({
  locale,
  training,
  searchParams,
  fixedDistrict,
}: {
  locale: Locale;
  training: string;
  searchParams: RawSearchParams & { view?: string };
  fixedDistrict?: string;
}) {
  setRequestLocale(locale);

  const definition = getTrainingPageDefinition(training);
  if (!definition) notFound();

  const t = await getTranslations("trainingPages");
  const common = await getTranslations("common");
  const districtPages = await getTranslations("districtPages");
  const currentDistrictCode =
    fixedDistrict ??
    (typeof searchParams.district === "string" ? searchParams.district : undefined);
  const currentDistrict = currentDistrictCode
    ? getDistrictPageDefinitionByCode(currentDistrictCode)
    : null;
  const currentDistrictName =
    currentDistrict && (locale === "en" || locale === "zh-HK")
      ? getDistrictPageLabel(currentDistrict, locale)
      : null;
  const result = await searchGyms({
    ...searchParams,
    collection: definition.slug,
    ...(fixedDistrict ? { district: fixedDistrict } : {}),
  });
  const searchQuery = getTrainingSearchQuery(definition);
  const searchHref = searchQuery ? `/search?${searchQuery}` : "/search";
  const filterBasePath =
    fixedDistrict && currentDistrict
      ? `/${definition.slug}/districts/${currentDistrict.slug}`
      : `/${definition.slug}`;
  const hidesCriteriaAndRelatedEquipment = [
    "hyrox-official-hong-kong",
    "olympic-lifting-hong-kong",
    "powerlifting-hong-kong",
    "bodybuilding-hong-kong",
    "hybrid-training-hong-kong",
  ].includes(definition.slug);

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 max-w-3xl">
            <Link
              href="/search"
              className="text-sm text-gray-500 transition-colors hover:text-gray-900"
            >
              {common("back")}
            </Link>
            <h1 className="mt-4 min-w-0 break-words text-2xl font-semibold text-gray-900 [overflow-wrap:anywhere] sm:text-3xl">
              {t(`items.${definition.slug}.h1`)}
            </h1>
            <p className="mt-2 max-w-3xl text-gray-500">
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

      <div className="mx-auto max-w-6xl min-w-0 px-4 py-6">
        {!hidesCriteriaAndRelatedEquipment ? (
          <>
            <p className="mb-3 max-w-3xl text-sm leading-6 text-gray-500">
              {t(`items.${definition.slug}.criteria`)}
            </p>
            <p className="mb-4 max-w-3xl text-sm text-gray-500">
              {t("communityNote")}
            </p>
          </>
        ) : null}

        {!hidesCriteriaAndRelatedEquipment ? (
          <section className="mb-5 min-w-0 max-w-full">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">
              {t("relatedEquipment")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {definition.equipmentLinks.map((equipmentSlug) => {
                const equipment = getEquipmentPageDefinition(equipmentSlug);
                if (!equipment) return null;
                return (
                  <Link
                    key={equipmentSlug}
                    href={`/equipment/${equipmentSlug}`}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
                  >
                    {t(`equipment.${equipment.slug}`)}
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mb-5 min-w-0 max-w-full">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">
            {districtPages("browseTitle")}
          </h2>
          <DistrictBrowseControls
            currentDistrictCode={currentDistrictCode}
            trainingSlug={definition.slug}
          />
        </section>

        {currentDistrictName ? (
          <div className="mb-4 min-w-0 max-w-full">
            <h1 className="min-w-0 break-words text-sm text-gray-500 [overflow-wrap:anywhere]">
              {districtPages("h1", { district: currentDistrictName })}
            </h1>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-6 md:flex-row">
          <Suspense fallback={<div className="min-w-0 w-full shrink-0 md:w-64" />}>
            <SearchFilters
              basePath={filterBasePath}
              fixedCollection={definition.slug}
              fixedDistrict={fixedDistrict}
            />
          </Suspense>
          <SearchResultsPanel
            result={result}
            initialView={
              typeof searchParams.view === "string" ? searchParams.view : undefined
            }
            apiSearchParams={{
              collection: definition.slug,
              ...(fixedDistrict ? { district: fixedDistrict } : {}),
            }}
          />
        </div>
      </div>
    </main>
  );
}
