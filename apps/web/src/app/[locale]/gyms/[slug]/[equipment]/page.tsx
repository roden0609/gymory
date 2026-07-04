import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GymCard } from "@/components/search/GymCard";
import { Link } from "@/i18n/navigation";
import {
  DISTRICT_PAGE_DEFINITIONS,
  getDistrictPageDefinition,
  getDistrictPageLabel,
} from "@/lib/district-pages";
import {
  EQUIPMENT_PAGE_DEFINITIONS,
  getEquipmentPageDefinition,
  getEquipmentSearchQuery,
} from "@/lib/equipment-pages";
import { getGymsForEquipmentPage } from "@/lib/db/queries/equipment-pages";
import { buildSeoMetadata } from "@/lib/seo";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale; slug: string; equipment: string }>;
};

export function generateStaticParams() {
  return DISTRICT_PAGE_DEFINITIONS.flatMap((district) =>
    EQUIPMENT_PAGE_DEFINITIONS.map((equipment) => ({
      slug: district.slug,
      equipment: equipment.slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, equipment } = await params;
  const district = getDistrictPageDefinition(slug);
  const definition = getEquipmentPageDefinition(equipment);
  if (!district || !definition) return {};

  const t = await getTranslations({ locale, namespace: "districtEquipmentPages" });
  const equipmentPages = await getTranslations({
    locale,
    namespace: "equipmentPages",
  });
  const result = await getGymsForEquipmentPage(definition, {
    districtCode: district.code,
  });
  const districtName = getDistrictPageLabel(district, locale);
  const equipmentName = equipmentPages(`items.${definition.slug}.shortName`);

  return buildSeoMetadata({
    locale,
    path: `/gyms/${district.slug}/${definition.slug}`,
    title: t("title", { equipment: equipmentName, district: districtName }),
    description: t("description", {
      equipment: equipmentName,
      district: districtName,
    }),
    robots: result.totalCount === 0 ? { index: false, follow: true } : undefined,
  });
}

export default async function DistrictEquipmentLandingPage({ params }: Props) {
  const { locale, slug, equipment } = await params;
  setRequestLocale(locale);

  const district = getDistrictPageDefinition(slug);
  const definition = getEquipmentPageDefinition(equipment);
  if (!district || !definition) notFound();

  const t = await getTranslations("districtEquipmentPages");
  const equipmentPages = await getTranslations("equipmentPages");
  const common = await getTranslations("common");
  const result = await getGymsForEquipmentPage(definition, {
    districtCode: district.code,
  });
  const districtName = getDistrictPageLabel(district, locale);
  const equipmentName = equipmentPages(`items.${definition.slug}.shortName`);
  const searchQuery = new URLSearchParams(getEquipmentSearchQuery(definition));
  searchQuery.set("district", district.code);
  const searchHref = `/search?${searchQuery.toString()}`;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Link
                href={`/equipment/${definition.slug}`}
                className="text-sm text-gray-500 transition-colors hover:text-gray-900"
              >
                {common("back")}
              </Link>
              <h1 className="mt-4 text-3xl font-bold text-gray-900">
                {t("h1", { equipment: equipmentName, district: districtName })}
              </h1>
              <p className="mt-3 text-base leading-7 text-gray-600">
                {t("intro", { equipment: equipmentName, district: districtName })}
              </p>
            </div>
            <Link
              href={searchHref}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              {equipmentPages("openInSearch")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <Stat label={equipmentPages("matchedGyms")} value={result.totalCount} />
          <Stat
            label={equipmentPages("verifiedGyms")}
            value={result.gyms.filter((gym) => gym.is_verified).length}
          />
          <Stat
            label={equipmentPages("mappedGyms")}
            value={
              result.gyms.filter((gym) => gym.lat !== null && gym.lng !== null)
                .length
            }
          />
        </section>

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {equipmentPages("criteria")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {equipmentPages(`items.${definition.slug}.criteria`)}
          </p>
          <p className="mt-3 text-sm text-gray-500">
            {equipmentPages("communityNote")}
          </p>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {t("gymListTitle", {
                equipment: equipmentName,
                district: districtName,
              })}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {equipmentPages("gymListSubtitle")}
            </p>
          </div>

          {result.gyms.length > 0 ? (
            <div className="space-y-3">
              {result.gyms.map((gym, index) => (
                <GymCard
                  key={gym.id}
                  gym={gym}
                  resultPosition={index + 1}
                  resultSource="district_page"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="font-medium text-gray-900">
                {t("noResults", {
                  equipment: equipmentName,
                  district: districtName,
                })}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {equipmentPages("noResultsSub")}
              </p>
              <Link
                href="/submit"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                {equipmentPages("submitEquipment")}
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
