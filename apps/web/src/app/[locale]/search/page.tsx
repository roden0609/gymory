import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TransientBanner } from "@/components/common/TransientBanner";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResultsPanel } from "@/components/search/SearchResultsPanel";
import { TrainingTagLinks } from "@/components/search/TrainingTagLinks";
import { Link } from "@/i18n/navigation";
import { HK_DISTRICTS, getHkDistrictLabel } from "@gymory/shared";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";
import { getDistrictPageDefinitionByCode } from "@/lib/district-pages";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return buildSeoMetadata({
    locale,
    path: "/search",
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

  const common = await getTranslations("common");
  const t = await getTranslations("search");
  const districtPages = await getTranslations("districtPages");
  const result = await searchGyms(searchParams);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mt-2 max-w-2xl text-gray-500">
              {common("tagline")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/contributors"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {common("contributors")}
            </Link>
            <Link
              href="/submit"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              {common("submitNewGym")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {searchParams.flash === "submission-success" && (
          <TransientBanner
            message={common("submissionPendingReview")}
            clearQueryKeys={["flash"]}
          />
        )}
        <p className="mb-4 max-w-3xl text-sm text-gray-500">
          {t("communityContribution")}
        </p>
        <TrainingTagLinks />
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">
            {districtPages("browseTitle")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {HK_DISTRICTS.map((district) => {
              const districtPage = getDistrictPageDefinitionByCode(district.code);
              if (!districtPage) return null;

              return (
                <Link
                  key={district.code}
                  href={`/districts/${districtPage.slug}`}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
                >
                  {getHkDistrictLabel(district.code, locale as "en" | "zh-HK")}
                </Link>
              );
            })}
          </div>
        </section>
        <div className="flex flex-col gap-6 md:flex-row">
          <Suspense fallback={<div className="w-full shrink-0 md:w-64" />}>
            <SearchFilters />
          </Suspense>
          <SearchResultsPanel
            result={result}
            initialView={
              typeof searchParams.view === "string" ? searchParams.view : undefined
            }
          />
        </div>
      </div>
    </main>
  );
}
