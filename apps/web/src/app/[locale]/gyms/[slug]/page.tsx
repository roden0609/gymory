import { Fragment } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Gym } from "@gymory/shared";
import { GYM_CHAINS, getHkDistrictLabel } from "@gymory/shared";
import { AnalyticsEventOnMount } from "@/components/analytics/AnalyticsEventOnMount";
import { TrackedExternalLink } from "@/components/analytics/TrackedExternalLink";
import { EquipmentSection, EquipmentSections } from "@/components/gym/EquipmentSections";
import { EquipmentTypeInventory } from "@/components/gym/EquipmentTypeInventory";
import { GymAccuracyVoting } from "@/components/gym/GymAccuracyVoting";
import { TransientBanner } from "@/components/common/TransientBanner";
import { Link } from "@/i18n/navigation";
import { getFirebaseSessionUser } from "@/lib/auth/session";
import { getGymAccuracySnapshot } from "@/lib/db/queries/gym-accuracy";
import { getGymEquipmentBrands } from "@/lib/db/queries/equipment-brands";
import { getPublicGymMachineInventory } from "@/lib/db/queries/equipment-machine-inventory";
import { getGymBySlug } from "@/lib/db/queries/gyms";
import { getHyroxEquipmentTypes, groupGymEquipmentTypes } from "@/lib/equipment-machine-inventory";
import { buildSeoMetadata, getLocalizedUrl } from "@/lib/seo";

type Locale = "en" | "zh-HK";

const OPENING_HOURS_DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "public_holidays",
] as const;

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ flash?: string }>;
};

function getLocalizedGym(gym: Gym, locale: Locale) {
  return {
    name: locale === "zh-HK" && gym.name_zh ? gym.name_zh : gym.name,
    address:
      locale === "zh-HK" && gym.address_zh ? gym.address_zh : gym.address,
    district: getHkDistrictLabel(gym.district_code, locale),
  };
}

function getGymChainSlug(gymSlug: string) {
  return (
    GYM_CHAINS.find((chain) =>
      chain.slugPrefixes.some((prefix) => gymSlug.startsWith(prefix))
    )?.slug ?? undefined
  );
}

function removeUndefinedValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues).filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, removeUndefinedValues(item)])
        .filter(([, item]) => item !== undefined)
    );
  }

  return value === undefined || value === null || value === "" ? undefined : value;
}

function buildGymJsonLd({
  gym,
  locale,
  display,
  description,
}: {
  gym: Gym;
  locale: Locale;
  display: ReturnType<typeof getLocalizedGym>;
  description: string;
}) {
  const sameAs = [gym.website_url, gym.instagram_url].filter(Boolean);

  return removeUndefinedValues({
    "@context": "https://schema.org",
    "@type": "ExerciseGym",
    name: display.name,
    description,
    url: getLocalizedUrl(locale, `/gyms/${gym.slug}`),
    telephone: gym.contact_phone,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    priceRange: gym.day_pass_price !== null ? `HK$${gym.day_pass_price}` : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: display.address,
      addressLocality: display.district,
      addressCountry: gym.country_code,
      postalCode: gym.postal_code,
    },
    geo:
      gym.lat !== null && gym.lng !== null
        ? {
            "@type": "GeoCoordinates",
            latitude: gym.lat,
            longitude: gym.lng,
          }
        : undefined,
  });
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatOpeningHoursDay(
  day: string,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  switch (day) {
    case "monday":
      return t("openingDayMonday");
    case "tuesday":
      return t("openingDayTuesday");
    case "wednesday":
      return t("openingDayWednesday");
    case "thursday":
      return t("openingDayThursday");
    case "friday":
      return t("openingDayFriday");
    case "saturday":
      return t("openingDaySaturday");
    case "sunday":
      return t("openingDaySunday");
    case "public_holidays":
      return t("openingDayPublicHolidays");
    default:
      return formatLabel(day);
  }
}

function sortOpeningHoursEntries(openingHours: Record<string, string>) {
  const dayOrder = new Map<string, number>(
    OPENING_HOURS_DAY_ORDER.map((day, index) => [day, index])
  );

  return Object.entries(openingHours).sort(([dayA], [dayB]) => {
    const orderA = dayOrder.get(dayA) ?? Number.MAX_SAFE_INTEGER;
    const orderB = dayOrder.get(dayB) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return dayA.localeCompare(dayB);
  });
}

function formatDataSource(
  value: Gym["data_source"],
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  if (!value) return t("notListed");

  switch (value) {
    case "admin":
      return t("dataSourceAdmin");
    case "owner":
      return t("dataSourceOwner");
    case "import":
      return t("dataSourceOnline");
    case "user_submission":
      return t("dataSourceUser");
    default:
      return formatLabel(value);
  }
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatPrice(value: number | null, countryCode: string, locale: Locale) {
  if (value === null) return null;
  const currency = countryCode === "HK" ? "HKD" : "USD";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatWeight(value: number | null, fallback: string) {
  return value === null ? fallback : `${value}kg`;
}

function formatSizeCategory(
  value: Gym["size_category"],
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  if (!value) return t("notListed");

  switch (value) {
    case "small":
      return t("sizeSmall");
    case "medium":
      return t("sizeMedium");
    case "large":
      return t("sizeLarge");
    default:
      return formatLabel(value);
  }
}

function hasKnownData(values: readonly unknown[]) {
  return values.some((value) => {
    if (typeof value === "string") return value.trim().length > 0;
    return value !== null && value !== undefined;
  });
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-gray-200 py-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MissingEquipmentCta({
  href,
  label,
  actionLabel,
}: {
  href: string;
  label: string;
  actionLabel: string;
}) {
  return (
    <p className="text-sm text-gray-500">
      {label}{" "}
      <Link
        href={href}
        className="font-medium text-gray-700 underline underline-offset-4 hover:text-gray-900"
      >
        {actionLabel}
      </Link>
    </p>
  );
}

function FirstContributorCta({
  href,
  title,
  description,
  actionLabel,
  helperText,
}: {
  href: string;
  title: string;
  description: string;
  actionLabel: string;
  helperText: string;
}) {
  return (
    <div className="mb-6 rounded-lg border border-dashed border-gray-300 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900">{title}</p>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        </div>
        <Link
          href={href}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

const SUBMIT_SECTION_HASHES = {
  freeWeight: "submit-section-free-weight",
  cardio: "submit-section-cardio",
  hyrox: "submit-section-hyrox",
  cable: "submit-section-cable",
  fullBodyMachine: "submit-section-full-body-machine",
  coreMachine: "submit-section-core-machine",
  armMachine: "submit-section-arm-machine",
  chestMachine: "submit-section-chest-machine",
  backMachine: "submit-section-back-machine",
  shoulderMachine: "submit-section-shoulder-machine",
  legMachine: "submit-section-leg-machine",
  functionalTraining: "submit-section-functional-training",
  otherEquipment: "submit-section-other-equipment",
  amenities: "submit-section-amenities",
  equipmentBrands: "submit-section-equipment-brands",
} as const;

type SubmitSectionHash =
  (typeof SUBMIT_SECTION_HASHES)[keyof typeof SUBMIT_SECTION_HASHES];

function ValueGrid({
  items,
}: {
  items: Array<{ label: string; value: string | number }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm"
        >
          <span className="min-w-0 break-words text-gray-600 [overflow-wrap:anywhere]">{item.label}</span>
          <span className="min-w-0 text-right font-medium text-gray-900 break-words [overflow-wrap:anywhere]">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function FeaturePills({
  items,
  fallback,
}: {
  items: string[];
  fallback: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">{fallback}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((label) => (
        <span
          key={label}
          className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const gym = await getGymBySlug(slug);

  if (!gym) {
    return { title: "Gym not found" };
  }

  const display = getLocalizedGym(gym, locale);
  const description = [display.district, display.address]
    .filter(Boolean)
    .join(" · ");

  return buildSeoMetadata({
    locale,
    path: `/gyms/${slug}`,
    title: display.name,
    description:
      description || "Gym equipment, location, and training details on Gymory.",
  });
}

export default async function GymDetailPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { flash } = await searchParams;
  setRequestLocale(locale);

  const gym = await getGymBySlug(slug);
  if (!gym) notFound();
  const sessionUser = await getFirebaseSessionUser();
  const [brands, machineInventory, accuracySnapshot] = await Promise.all([
    getGymEquipmentBrands(gym.id),
    getPublicGymMachineInventory(gym.id),
    getGymAccuracySnapshot({ gymId: gym.id, firebaseUid: sessionUser?.uid }),
  ]);
  const equipmentGroups = groupGymEquipmentTypes(gym.equipment_inventory, machineInventory);
  const hyroxEquipment = getHyroxEquipmentTypes(equipmentGroups);

  const t = await getTranslations("gym");
  const common = await getTranslations("common");
  const display = getLocalizedGym(gym, locale);
  const metaDescription =
    [display.district, display.address].filter(Boolean).join(" · ") ||
    "Gym equipment, location, and training details on Gymory.";
  const jsonLd = buildGymJsonLd({
    gym,
    locale,
    display,
    description: metaDescription,
  });
  const verifiedDate = formatDate(gym.equipment_last_verified_at, locale);
  const updatedDate = formatDate(gym.updated_at, locale);
  const dayPassPrice = formatPrice(gym.day_pass_price, gym.country_code, locale);
  const mapsUrl =
    gym.lat !== null && gym.lng !== null
      ? `https://www.google.com/maps/search/?api=1&query=${gym.lat},${gym.lng}`
      : null;

  const freeWeightRanges = [
    { label: t("dumbbellMin"), value: formatWeight(gym.dumbbell_min_weight_kg, t("notListed")) },
    { label: t("dumbbellMax"), value: formatWeight(gym.dumbbell_max_weight_kg, t("notListed")) },
    { label: t("plateMin"), value: formatWeight(gym.plate_min_weight_kg, t("notListed")) },
    { label: t("plateMax"), value: formatWeight(gym.plate_max_weight_kg, t("notListed")) },
  ];
  const hasFreeWeightRanges = hasKnownData([
    gym.dumbbell_min_weight_kg, gym.dumbbell_max_weight_kg,
    gym.plate_min_weight_kg, gym.plate_max_weight_kg,
  ]);

  const amenities = [
    [t("washroom"), gym.has_washroom],
    [t("bathroom"), gym.has_bathroom],
    [t("changingRoom"), gym.has_changing_room],
    [t("freeWater"), gym.has_free_water],
    [t("drySauna"), gym.has_dry_sauna],
    [t("wetSauna"), gym.has_wet_sauna],
    [t("iceBath"), gym.has_ice_bath],
  ]
    .filter(([, hasFeature]) => hasFeature)
    .map(([label]) => label as string);

  const submitHref = `/submit?gymId=${gym.id}&returnTo=/gyms/${gym.slug}`;
  const submitSectionHref = (hash: SubmitSectionHash) => `${submitHref}#${hash}`;
  const missingEquipmentCta = (hash: SubmitSectionHash) => (
    <MissingEquipmentCta
      href={submitSectionHref(hash)}
      label={t("noDataYet")}
      actionLabel={t("addEquipmentDetails")}
    />
  );
  const amenitiesHasData = hasKnownData([
    gym.has_washroom,
    gym.has_bathroom,
    gym.has_changing_room,
    gym.has_free_water,
    gym.has_dry_sauna,
    gym.has_wet_sauna,
    gym.has_ice_bath,
  ]);
  const hasAnyTrainingEquipmentData =
    equipmentGroups.some(({ items }) => items.length > 0) || hasFreeWeightRanges || brands.length > 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <AnalyticsEventOnMount
        eventName="view_gym"
        params={{
          gym_slug: gym.slug,
          gym_name: display.name,
          district: gym.district_code,
          chain: getGymChainSlug(gym.slug),
          locale,
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link
            href="/search"
            className="text-sm text-gray-500 transition-colors hover:text-gray-900"
          >
            {common("back")}
          </Link>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {display.name}
                </h1>
                {gym.is_verified && (
                  <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {t("verified")}
                  </span>
                )}
                {gym.is_hyrox_official && (
                  <span
                    className="rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-800"
                    title={t("hyroxOfficialSource")}
                  >
                    {t("hyroxOfficial")}
                  </span>
                )}
              </div>
              <p className="mt-2 break-words text-gray-500">
                {display.district}
                {display.address ? ` · ${display.address}` : ""}
              </p>
              {gym.is_verified && verifiedDate && (
                <p className="mt-2 text-sm text-gray-400">
                  {t("verifiedAt", { date: verifiedDate })}
                </p>
              )}
              {updatedDate && (
                <p className="mt-2 text-sm text-gray-400">
                  {t("lastUpdated", { date: updatedDate })}
                </p>
              )}
            </div>

            <Link
              href={submitHref}
              className="inline-flex h-10 shrink-0 whitespace-nowrap items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              {t("suggestUpdate")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {flash === "submission-success" && (
          <TransientBanner
            message={common("submissionPendingReview")}
            clearQueryKeys={["flash"]}
          />
        )}
        {!hasAnyTrainingEquipmentData && (
          <FirstContributorCta
            href={submitHref}
            title={t("firstContributorTitle")}
            description={t("firstContributorDescription")}
            helperText={t("firstContributorHelper")}
            actionLabel={t("firstContributorAction")}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("size")} value={formatSizeCategory(gym.size_category, t)} />
          <StatCard
            label={t("floorArea")}
            value={
              gym.estimated_size_sqft !== null
                ? `${gym.estimated_size_sqft.toLocaleString()} sqft`
                : t("notListed")
            }
          />
          <StatCard
            label={t("dayPass")}
            value={dayPassPrice ?? t("notListed")}
          />
          <StatCard
            label={t("dataSource")}
            value={formatDataSource(gym.data_source, t)}
          />
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white px-5">
          <EquipmentSections>
            {equipmentGroups.map(({ category, items }) => (
              <Fragment key={category.code}>
                <EquipmentSection title={locale === "zh-HK" ? category.nameZh : category.name}
                  count={items.filter((item) => item.isPresent).length}
                  collapsible={items.length > 0 || (category.code === "free_weight" && hasFreeWeightRanges)}>
                  {items.length > 0 ? (
                    <EquipmentTypeInventory
                      items={items}
                      locale={locale}
                      availableLabel={t("available")}
                      absentLabel={t("equipmentAbsent")}
                      detailsLabel={t("showEquipmentDetails")}
                      quantityLabel={(quantity) => t("machineQuantity", { quantity })}
                    />
                  ) : category.code === "free_weight" && hasFreeWeightRanges ? null : (
                    missingEquipmentCta(SUBMIT_SECTION_HASHES[category.section])
                  )}
                  {category.code === "free_weight" && hasFreeWeightRanges && (
                    <div className="mt-4"><ValueGrid items={freeWeightRanges} /></div>
                  )}
                </EquipmentSection>
                {category.code === "cardio" && (
                  <EquipmentSection title={t("hyrox")} count={hyroxEquipment.length}
                    collapsible={hyroxEquipment.length > 0}>
                    {hyroxEquipment.length > 0 ? (
                      <EquipmentTypeInventory
                        items={hyroxEquipment}
                        locale={locale}
                        availableLabel={t("available")}
                        absentLabel={t("equipmentAbsent")}
                        detailsLabel={t("showEquipmentDetails")}
                        quantityLabel={(quantity) => t("machineQuantity", { quantity })}
                      />
                    ) : (
                      missingEquipmentCta(SUBMIT_SECTION_HASHES.hyrox)
                    )}
                  </EquipmentSection>
                )}
              </Fragment>
            ))}
          </EquipmentSections>

          <Section title={t("amenities")}>
            {amenitiesHasData ? (
              <FeaturePills items={amenities} fallback={t("notListed")} />
            ) : (
              missingEquipmentCta(SUBMIT_SECTION_HASHES.amenities)
            )}
          </Section>

          <Section title={t("equipmentBrands")}>
            {brands.length > 0 ? (
              <FeaturePills
                items={brands.map((brand) =>
                  locale === "zh-HK" && brand.name_zh ? brand.name_zh : brand.name_en
                )}
                fallback={t("notListed")}
              />
            ) : (
              missingEquipmentCta(SUBMIT_SECTION_HASHES.equipmentBrands)
            )}
          </Section>

          <Section title={t("location")}>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-gray-900">{display.district}</p>
              {display.address && (
                <p className="mt-1 text-sm text-gray-600">{display.address}</p>
              )}
              {mapsUrl && (
                <TrackedExternalLink
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-medium text-gray-900 underline"
                  tracking={{
                    eventName: "open_google_maps",
                    gymSlug: gym.slug,
                    gymName: display.name,
                    district: gym.district_code,
                  }}
                >
                  {t("openMap")}
                </TrackedExternalLink>
              )}
            </div>
          </Section>

          <Section title={t("openingHours")}>
            {gym.opening_hours_json ? (
              <dl className="grid gap-2 sm:grid-cols-2">
                {sortOpeningHoursEntries(gym.opening_hours_json).map(
                  ([day, hours]) => (
                    <div
                      key={day}
                      className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                    >
                      <dt className="font-medium text-gray-700">
                        {formatOpeningHoursDay(day, t)}
                      </dt>
                      <dd className="text-gray-600">{hours}</dd>
                    </div>
                  )
                )}
              </dl>
            ) : (
              <p className="text-sm text-gray-500">{t("notListed")}</p>
            )}
          </Section>

          <Section title={t("contact")}>
            <div className="flex flex-wrap gap-3">
              {gym.website_url && (
                <TrackedExternalLink
                  href={gym.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  tracking={{
                    eventName: "visit_gym_website",
                    gymSlug: gym.slug,
                    gymName: display.name,
                    linkType: "official_website",
                  }}
                >
                  {t("website")}
                </TrackedExternalLink>
              )}
              {gym.instagram_url && (
                <TrackedExternalLink
                  href={gym.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  tracking={{
                    eventName: "visit_gym_website",
                    gymSlug: gym.slug,
                    gymName: display.name,
                    linkType: "instagram",
                  }}
                >
                  Instagram
                </TrackedExternalLink>
              )}
              {gym.contact_phone && (
                <a
                  href={`tel:${gym.contact_phone}`}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {gym.contact_phone}
                </a>
              )}
              {!gym.website_url && !gym.instagram_url && !gym.contact_phone && (
                <p className="text-sm text-gray-500">{t("notListed")}</p>
              )}
            </div>
          </Section>
        </div>
        <div className="mt-8">
          <GymAccuracyVoting
            gymId={gym.id}
            initialSnapshot={accuracySnapshot}
            isLoggedIn={Boolean(sessionUser)}
          />
        </div>
      </div>
    </main>
  );
}
