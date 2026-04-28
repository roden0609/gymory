import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TransientBanner } from "@/components/common/TransientBanner";
import { SearchFilters } from "@/components/search/SearchFilters";
import { GymList } from "@/components/search/GymList";
import { Link } from "@/i18n/navigation";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: RawSearchParams & { flash?: string };
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
          <GymList {...result} />
        </div>
      </div>
    </main>
  );
}
