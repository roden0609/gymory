import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getGymsForTrainingPage } from "@/lib/db/queries/training-pages";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";
import { getEquipmentPageDefinition } from "@/lib/equipment-pages";
import {
  getTrainingPageDefinition,
  getTrainingSearchQuery,
} from "@/lib/training-pages";
import { buildSeoMetadata } from "@/lib/seo";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResultsPanel } from "@/components/search/SearchResultsPanel";

type Locale = "en" | "zh-HK";

export async function generateTrainingCollectionMetadata({
  locale,
  training,
}: {
  locale: Locale;
  training: string;
}): Promise<Metadata> {
  const definition = getTrainingPageDefinition(training);
  if (!definition) return {};

  const t = await getTranslations({ locale, namespace: "trainingPages" });
  const result = await getGymsForTrainingPage(definition);

  return buildSeoMetadata({
    locale,
    path: `/gyms/${definition.slug}`,
    title: t(`items.${definition.slug}.title`),
    description: t(`items.${definition.slug}.description`),
    robots: result.totalCount === 0 ? { index: false, follow: true } : undefined,
  });
}

export async function TrainingCollectionPage({
  locale,
  training,
  searchParams,
}: {
  locale: Locale;
  training: string;
  searchParams: RawSearchParams & { view?: string };
}) {
  setRequestLocale(locale);

  const definition = getTrainingPageDefinition(training);
  if (!definition) notFound();

  const t = await getTranslations("trainingPages");
  const common = await getTranslations("common");
  const statsResult = await getGymsForTrainingPage(definition);
  const result = await searchGyms({
    ...searchParams,
    collection: definition.slug,
  });
  const searchQuery = getTrainingSearchQuery(definition);
  const searchHref = searchQuery ? `/search?${searchQuery}` : "/search";
  const verifiedGyms = statsResult.gyms.filter((gym) => gym.is_verified).length;
  const gymsWithCoordinates = statsResult.gyms.filter(
    (gym) => gym.lat !== null && gym.lng !== null
  ).length;

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
          <Stat label={t("matchedGyms")} value={statsResult.totalCount} />
          <Stat label={t("verifiedGyms")} value={verifiedGyms} />
          <Stat label={t("mappedGyms")} value={gymsWithCoordinates} />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">{t("criteria")}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {t(`items.${definition.slug}.criteria`)}
            </p>
            <p className="mt-3 text-sm text-gray-500">{t("communityNote")}</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("relatedEquipment")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {definition.equipmentLinks.map((equipmentSlug) => {
                const equipment = getEquipmentPageDefinition(equipmentSlug);
                if (!equipment) return null;
                return (
                  <Link
                    key={equipmentSlug}
                    href={`/equipment/${equipmentSlug}`}
                    className="inline-flex rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400"
                  >
                    {t(`equipment.${equipment.slug}`)}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {t("gymListTitle")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{t("gymListSubtitle")}</p>
          </div>

          <div className="flex flex-col gap-6 md:flex-row">
            <Suspense fallback={<div className="w-full shrink-0 md:w-64" />}>
              <SearchFilters
                basePath={`/gyms/${definition.slug}`}
                fixedCollection={definition.slug}
              />
            </Suspense>
            <SearchResultsPanel
              result={result}
              initialView={
                typeof searchParams.view === "string"
                  ? searchParams.view
                  : undefined
              }
              apiSearchParams={{
                collection: definition.slug,
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
