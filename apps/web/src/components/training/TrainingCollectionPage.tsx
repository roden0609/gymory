import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getHkDistrictLabel, type GymSummary } from "@gymory/shared";
import { Link } from "@/i18n/navigation";
import { getGymsForTrainingPage } from "@/lib/db/queries/training-pages";
import { getEquipmentPageDefinition } from "@/lib/equipment-pages";
import {
  getTrainingPageDefinition,
  getTrainingSearchQuery,
  type TrainingPageDefinition,
  type TrainingSignal,
} from "@/lib/training-pages";
import { buildSeoMetadata } from "@/lib/seo";

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
}: {
  locale: Locale;
  training: string;
}) {
  setRequestLocale(locale);

  const definition = getTrainingPageDefinition(training);
  if (!definition) notFound();

  const t = await getTranslations("trainingPages");
  const common = await getTranslations("common");
  const result = await getGymsForTrainingPage(definition);
  const searchQuery = getTrainingSearchQuery(definition);
  const searchHref = searchQuery ? `/search?${searchQuery}` : "/search";
  const verifiedGyms = result.gyms.filter((gym) => gym.is_verified).length;
  const gymsWithCoordinates = result.gyms.filter(
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
          <Stat label={t("matchedGyms")} value={result.totalCount} />
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

          {result.gyms.length > 0 ? (
            <div className="space-y-3">
              {result.gyms.map((gym) => (
                <TrainingGymCard
                  key={gym.id}
                  gym={gym}
                  definition={definition}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="font-medium text-gray-900">{t("noResults")}</p>
              <p className="mt-2 text-sm text-gray-500">{t("noResultsSub")}</p>
              <Link
                href="/submit"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                {t("submitEquipment")}
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

async function TrainingGymCard({
  gym,
  definition,
  locale,
}: {
  gym: GymSummary;
  definition: TrainingPageDefinition;
  locale: Locale;
}) {
  const t = await getTranslations("trainingPages");
  const gymTranslations = await getTranslations("gym");
  const displayName = locale === "zh-HK" && gym.name_zh ? gym.name_zh : gym.name;
  const displayAddress =
    locale === "zh-HK" && gym.address_zh ? gym.address_zh : gym.address;
  const districtLabel = getHkDistrictLabel(gym.district_code, locale);
  const signals = definition.getSignals(gym);
  const submitHref = `/submit?gymId=${gym.id}&returnTo=/gyms/${gym.slug}`;

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-400 hover:shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/gyms/${gym.slug}`}
            className="font-semibold text-gray-900 hover:underline"
          >
            {displayName}
          </Link>
          <p className="mt-0.5 text-sm text-gray-500">
            {districtLabel}
            {displayAddress ? ` · ${displayAddress}` : ""}
          </p>
        </div>

        {gym.is_verified && (
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            {gymTranslations("verified")}
          </span>
        )}
      </div>

      {signals.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {signals.map((signal) => (
            <span
              key={`${signal.labelKey}-${signal.count ?? "yes"}`}
              className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
            >
              {formatSignal(signal, t)}
            </span>
          ))}
        </div>
      ) : (
        <Link
          href={submitHref}
          className="mt-4 inline-flex text-sm font-medium text-gray-600 underline underline-offset-4 hover:text-gray-900"
        >
          {t("helpVerify")}
        </Link>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="font-medium text-gray-600">
          {t("accuracyHeading")}:
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
          👍 {gym.accuracy_like_count ?? 0}
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
          👎 {gym.accuracy_dislike_count ?? 0}
        </span>
      </div>
    </article>
  );
}

function formatSignal(
  signal: TrainingSignal,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  const label = t(`signals.${signal.labelKey}`);
  return typeof signal.count === "number" ? `${label}: ${signal.count}` : label;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
