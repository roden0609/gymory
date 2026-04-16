import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchFilters } from "@/components/search/SearchFilters";
import { GymList } from "@/components/search/GymList";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: RawSearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("common");
  const gyms = await searchGyms(searchParams);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="max-w-3xl text-3xl font-bold text-gray-900">
            {t("appName")}
          </h1>
          <p className="mt-2 max-w-2xl text-gray-500">{t("tagline")}</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-6 md:flex-row">
          <Suspense fallback={<div className="w-full shrink-0 md:w-64" />}>
            <SearchFilters />
          </Suspense>
          <GymList gyms={gyms} />
        </div>
      </div>
    </main>
  );
}
