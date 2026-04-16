import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Gym } from "@gymory/shared";
import { getHkDistrictLabel } from "@gymory/shared";
import { Link } from "@/i18n/navigation";
import { getGymBySlug } from "@/lib/db/queries/gyms";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

function getLocalizedGym(gym: Gym, locale: Locale) {
  return {
    name: locale === "zh-HK" && gym.name_zh ? gym.name_zh : gym.name,
    address:
      locale === "zh-HK" && gym.address_zh ? gym.address_zh : gym.address,
    district: getHkDistrictLabel(gym.district_code, locale),
  };
}

function formatTag(tag: string) {
  return tag
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

  return {
    title: display.name,
    description:
      description || "Gym equipment, location, and training details on Gymory.",
  };
}

export default async function GymDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const gym = await getGymBySlug(slug);
  if (!gym) notFound();

  const t = await getTranslations("gym");
  const common = await getTranslations("common");
  const display = getLocalizedGym(gym, locale);
  const verifiedDate = formatDate(gym.equipment_last_verified_at, locale);
  const dayPassPrice = formatPrice(gym.day_pass_price, gym.country_code, locale);
  const mapsUrl =
    gym.lat !== null && gym.lng !== null
      ? `https://www.google.com/maps/search/?api=1&query=${gym.lat},${gym.lng}`
      : null;

  const keyEquipment = [
    { label: t("racks"), value: gym.rack_count },
    { label: t("benches"), value: gym.bench_count },
    { label: t("barbells"), value: gym.barbell_count },
    {
      label: t("dumbbells"),
      value: gym.dumbbell_max_weight_kg
        ? `${gym.dumbbell_max_weight_kg}kg`
        : t("notListed"),
    },
    {
      label: t("plates"),
      value: gym.plate_max_weight_kg
        ? `${gym.plate_max_weight_kg}kg`
        : t("notListed"),
    },
    { label: t("assaultBike"), value: gym.assault_bike_count },
    { label: t("skiErg"), value: gym.ski_erg_count },
    { label: t("rower"), value: gym.rower_count },
    { label: t("sled"), value: gym.sled_count },
    { label: t("wallBall"), value: gym.wall_ball_count },
  ];

  const machines = [
    { label: t("cableMachine"), value: gym.cable_machine_count },
    { label: t("latPulldown"), value: gym.lat_pulldown_count },
    { label: t("chestPress"), value: gym.chest_press_count },
    { label: t("legPress"), value: gym.leg_press_count },
    { label: t("hackSquat"), value: gym.hack_squat_count },
  ];

  const features = [
    [t("smithMachine"), gym.has_smith_machine],
    [t("deadliftPlatform"), gym.has_deadlift_platform],
    [t("pullUpBar"), gym.has_pull_up_bar],
    [t("dipStation"), gym.has_dip_station],
    [t("trx"), gym.has_trx],
    [t("resistanceBands"), gym.has_resistance_band],
    [t("battleRopes"), gym.has_battle_ropes],
    [t("rings"), gym.has_rings],
    [t("gluteHamDeveloper"), gym.has_glute_ham_developer],
    [t("reverseHyper"), gym.has_reverse_hyper],
    [t("farmersHandles"), gym.has_farmers_handles],
  ].filter(([, hasFeature]) => hasFeature);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link
            href="/search"
            className="text-sm text-gray-500 transition-colors hover:text-gray-900"
          >
            {common("back")}
          </Link>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {display.name}
                </h1>
                {gym.is_verified && (
                  <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {t("verified")}
                  </span>
                )}
              </div>
              <p className="mt-2 text-gray-500">
                {display.district}
                {display.address ? ` · ${display.address}` : ""}
              </p>
              {verifiedDate && (
                <p className="mt-2 text-sm text-gray-400">
                  {t("lastVerified", { date: verifiedDate })}
                </p>
              )}
            </div>

            <Link
              href={`/submit?gymId=${gym.id}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              {t("suggestUpdate")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("size")} value={gym.size_category ?? t("notListed")} />
          <StatCard
            label={t("floorArea")}
            value={
              gym.estimated_size_sqft
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
            value={gym.data_source ? formatTag(gym.data_source) : t("notListed")}
          />
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white px-5">
          <Section title={t("equipment")}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {keyEquipment.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t("machines")}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {machines.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t("features")}>
            {features.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {features.map(([label]) => (
                  <span
                    key={label as string}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t("notListed")}</p>
            )}
          </Section>

          <Section title={t("equipmentTags")}>
            {gym.equipment_tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {gym.equipment_tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
                  >
                    {formatTag(tag)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t("notListed")}</p>
            )}
            {gym.equipment_notes && (
              <p className="mt-4 text-sm leading-6 text-gray-600">
                {gym.equipment_notes}
              </p>
            )}
          </Section>

          <Section title={t("location")}>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-gray-900">{display.district}</p>
              {display.address && (
                <p className="mt-1 text-sm text-gray-600">{display.address}</p>
              )}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-medium text-gray-900 underline"
                >
                  {t("openMap")}
                </a>
              )}
            </div>
          </Section>

          <Section title={t("openingHours")}>
            {gym.opening_hours_json ? (
              <dl className="grid gap-2 sm:grid-cols-2">
                {Object.entries(gym.opening_hours_json).map(([day, hours]) => (
                  <div
                    key={day}
                    className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <dt className="font-medium text-gray-700">{formatTag(day)}</dt>
                    <dd className="text-gray-600">{hours}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-gray-500">{t("notListed")}</p>
            )}
          </Section>

          <Section title={t("contact")}>
            <div className="flex flex-wrap gap-3">
              {gym.website_url && (
                <a
                  href={gym.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t("website")}
                </a>
              )}
              {gym.instagram_url && (
                <a
                  href={gym.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Instagram
                </a>
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
      </div>
    </main>
  );
}
