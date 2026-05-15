import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EQUIPMENT_BRANDS } from "@gymory/shared";
import { GymCard } from "@/components/search/GymCard";
import { Link } from "@/i18n/navigation";
import { getGymsForBrandPage } from "@/lib/db/queries/equipment-brands";
import { buildSeoMetadata } from "@/lib/seo";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale; brand: string }>;
};

export function generateStaticParams() {
  return EQUIPMENT_BRANDS.map((brand) => ({ brand: brand.slug }));
}

function getBrand(slug: string) {
  return EQUIPMENT_BRANDS.find((brand) => brand.slug === slug) ?? null;
}

function getBrandName(brand: (typeof EQUIPMENT_BRANDS)[number], locale: Locale) {
  return locale === "zh-HK" && brand.name_zh ? brand.name_zh : brand.name_en;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, brand: brandSlug } = await params;
  const brand = getBrand(brandSlug);
  if (!brand) return {};

  const t = await getTranslations({ locale, namespace: "brandPages" });
  const result = await getGymsForBrandPage(brand.slug);
  const brandName = getBrandName(brand, locale);

  return buildSeoMetadata({
    locale,
    path: `/brands/${brand.slug}`,
    title: t("title", { brand: brandName }),
    description: t("description", { brand: brandName }),
    robots: result.totalCount === 0 ? { index: false, follow: true } : undefined,
  });
}

export default async function BrandLandingPage({ params }: Props) {
  const { locale, brand: brandSlug } = await params;
  setRequestLocale(locale);

  const brand = getBrand(brandSlug);
  if (!brand) notFound();

  const t = await getTranslations("brandPages");
  const common = await getTranslations("common");
  const brandName = getBrandName(brand, locale);
  const result = await getGymsForBrandPage(brand.slug);
  const searchHref = `/search?brandSlugs=${brand.slug}`;
  const verifiedGyms = result.gyms.filter((gym) => gym.is_verified).length;

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
                {t("h1", { brand: brandName })}
              </h1>
              <p className="mt-3 text-base leading-7 text-gray-600">
                {t("intro", { brand: brandName })}
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
          <Stat
            label={t("country")}
            value={brand.country ?? t("unknownCountry")}
          />
        </section>

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("dataNoteTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {t("dataNote", { brand: brandName })}
          </p>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {t("gymListTitle", { brand: brandName })}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{t("gymListSubtitle")}</p>
          </div>

          {result.gyms.length > 0 ? (
            <div className="space-y-3">
              {result.gyms.map((gym) => (
                <GymCard key={gym.id} gym={gym} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="font-medium text-gray-900">
                {t("noResults", { brand: brandName })}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {t("noResultsSub", { brand: brandName })}
              </p>
              <Link
                href="/submit"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                {common("submitNewGym")}
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
