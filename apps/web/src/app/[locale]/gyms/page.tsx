import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GymList } from "@/components/search/GymList";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gym" });
  return buildSeoMetadata({
    locale,
    path: "/gyms",
    title: t("allGyms"),
    description: "Browse Hong Kong gyms listed on Gymory.",
  });
}

export default async function GymsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: RawSearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("gym");
  const result = await searchGyms(searchParams);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900">{t("allGyms")}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <GymList {...result} />
      </div>
    </main>
  );
}
