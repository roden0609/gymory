import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getGymBrandDirectory } from "@/lib/db/queries/gym-brand-pages";
import { buildSeoMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: "en" | "zh-HK" }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gymBrandPages" });
  const brands = await getGymBrandDirectory();
  return buildSeoMetadata({
    locale, path: "/gym-brands", title: t("directoryTitle"), description: t("directoryIntro"),
    robots: brands.some((brand) => brand.count > 0) ? undefined : { index: false, follow: true },
  });
}

export default async function GymBrandDirectoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [brands, t] = await Promise.all([getGymBrandDirectory(), getTranslations("gymBrandPages")]);
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-8">
        <h1 className="break-words text-2xl font-bold text-gray-900">{t("directoryTitle")}</h1>
        <p className="mt-2 break-words text-gray-600">{t("directoryIntro")}</p>
        {!brands.some((brand) => brand.count > 0) && <p className="mt-6 text-sm text-gray-500">{t("noLocations")}</p>}
        <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.filter((brand) => brand.count > 0).map((brand) => (
            <Link key={brand.slug} href={`/gym-brands/${brand.slug}`} className="min-w-0 max-w-full rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-400">
              <h2 className="break-words font-semibold text-gray-900">{locale === "zh-HK" ? brand.name_zh : brand.name_en}</h2>
              <p className="mt-2 text-sm text-gray-500">{t("branchCount", { count: brand.count })}</p>
            </Link>
          ))}
        </div>
        <Link href="/search" className="mt-6 inline-flex min-h-10 items-center text-sm text-gray-700 underline">{t("allGyms")}</Link>
      </div>
    </main>
  );
}
