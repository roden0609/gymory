import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TransientBanner } from "@/components/common/TransientBanner";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResultsPanel } from "@/components/search/SearchResultsPanel";
import { Link } from "@/i18n/navigation";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";
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

  const t = await getTranslations("common");
  const result = await searchGyms(searchParams);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mt-2 max-w-2xl text-gray-500">{t("tagline")}</p>
          </div>
          <Link
            href="/submit"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            {t("submitNewGym")}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {searchParams.flash === "submission-success" && (
          <TransientBanner
            message={t("submissionPendingReview")}
            clearQueryKeys={["flash"]}
          />
        )}
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
