import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Gym } from "@gymory/shared";
import { getHkDistrictLabel } from "@gymory/shared";
import { TransientBanner } from "@/components/common/TransientBanner";
import { Link } from "@/i18n/navigation";
import { getGymBySlug } from "@/lib/db/queries/gyms";

type Locale = "en" | "zh-HK";

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

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
    case "user_submission":
      return t("dataSourceAnonymous");
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

function formatCount(value: number | null, fallback: string) {
  return value === null ? fallback : value;
}

function formatWeight(value: number | null, fallback: string) {
  return value === null ? fallback : `${value}kg`;
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
          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
        >
          <span className="text-gray-600">{item.label}</span>
          <span className="font-medium text-gray-900">{item.value}</span>
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

  return {
    title: display.name,
    description:
      description || "Gym equipment, location, and training details on Gymory.",
  };
}

export default async function GymDetailPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { flash } = await searchParams;
  setRequestLocale(locale);

  const gym = await getGymBySlug(slug);
  if (!gym) notFound();

  const t = await getTranslations("gym");
  const common = await getTranslations("common");
  const display = getLocalizedGym(gym, locale);
  const verifiedDate = formatDate(gym.equipment_last_verified_at, locale);
  const updatedDate = formatDate(gym.updated_at, locale);
  const dayPassPrice = formatPrice(gym.day_pass_price, gym.country_code, locale);
  const mapsUrl =
    gym.lat !== null && gym.lng !== null
      ? `https://www.google.com/maps/search/?api=1&query=${gym.lat},${gym.lng}`
      : null;

  const freeWeight = [
    { label: t("racks"), value: formatCount(gym.rack_count, t("notListed")) },
    { label: t("benches"), value: formatCount(gym.bench_count, t("notListed")) },
    {
      label: t("barbells"),
      value: formatCount(gym.barbell_count, t("notListed")),
    },
    {
      label: t("dumbbells"),
      value: formatWeight(gym.dumbbell_max_weight_kg, t("notListed")),
    },
    {
      label: t("plateMin"),
      value: formatWeight(gym.plate_min_weight_kg, t("notListed")),
    },
    {
      label: t("plateMax"),
      value: formatWeight(gym.plate_max_weight_kg, t("notListed")),
    },
  ];

  const freeWeightFeatures = [
    [t("romanChair"), gym.has_roman_chair],
    [t("dipStation"), gym.has_dip_station],
    [t("pullUpBar"), gym.has_pull_up_bar],
    [t("reverseHyper"), gym.has_reverse_hyper],
    [t("trapBar"), gym.has_trap_bar],
    [t("safetySquatBar"), gym.has_safety_squat_bar],
    [t("farmersHandles"), gym.has_farmer_handles || gym.has_farmers_handles],
    [t("landmineAttachment"), gym.has_landmine_attachment],
    [t("swissBar"), gym.has_swiss_bar],
    [t("camberedBar"), gym.has_cambered_bar],
    [t("ezBar"), gym.has_ez_bar],
  ]
    .filter(([, hasFeature]) => hasFeature)
    .map(([label]) => label as string);

  const cardio = [
    { label: t("treadmill"), value: formatCount(gym.treadmill_count, t("notListed")) },
    { label: t("assaultBike"), value: formatCount(gym.assault_bike_count, t("notListed")) },
    { label: t("exerciseBike"), value: formatCount(gym.exercise_bike_count, t("notListed")) },
    { label: t("climber"), value: formatCount(gym.climber_count, t("notListed")) },
  ];

  const hyrox = [
    { label: t("assaultRunner"), value: formatCount(gym.assault_runner_count, t("notListed")) },
    { label: t("skiErg"), value: formatCount(gym.ski_erg_count, t("notListed")) },
    { label: t("rower"), value: formatCount(gym.rower_count, t("notListed")) },
    { label: t("sled"), value: formatCount(gym.sled_count, t("notListed")) },
    { label: t("wallBall"), value: gym.has_wall_ball ? t("available") : t("notListed") },
    { label: t("wallBall4kg"), value: formatCount(gym.wall_ball_4kg_count, t("notListed")) },
    { label: t("wallBall6kg"), value: formatCount(gym.wall_ball_6kg_count, t("notListed")) },
    { label: t("wallBall9kg"), value: formatCount(gym.wall_ball_9kg_count, t("notListed")) },
    { label: t("wallBallPlate9ft"), value: formatCount(gym.wall_ball_plate_9ft_count, t("notListed")) },
    { label: t("wallBallPlate10ft"), value: formatCount(gym.wall_ball_plate_10ft_count, t("notListed")) },
    { label: t("sandbag"), value: gym.has_sandbag ? t("available") : t("notListed") },
    { label: t("sandbag10kg"), value: formatCount(gym.sandbag_10kg_count, t("notListed")) },
    { label: t("sandbag20kg"), value: formatCount(gym.sandbag_20kg_count, t("notListed")) },
    { label: t("sandbag30kg"), value: formatCount(gym.sandbag_30kg_count, t("notListed")) },
    { label: t("kettlebell"), value: gym.has_kettlebell ? t("available") : t("notListed") },
    { label: t("kettlebell16kg"), value: formatCount(gym.kettlebell_16kg_count, t("notListed")) },
    { label: t("kettlebell24kg"), value: formatCount(gym.kettlebell_24kg_count, t("notListed")) },
    { label: t("kettlebell32kg"), value: formatCount(gym.kettlebell_32kg_count, t("notListed")) },
  ];

  const otherEquipment = [
    [t("battleRope"), gym.has_battle_rope || gym.has_battle_ropes],
    [t("foamRoller"), gym.has_foam_roller],
    [t("medicineBall"), gym.has_medicine_ball],
    [t("dipBelt"), gym.has_dip_belt],
    [t("weightVest"), gym.has_weight_vest],
    [t("liftingStraps"), gym.has_lifting_straps],
    [t("plyoBox"), gym.has_plyo_box],
    [t("balanceBall"), gym.has_balance_ball],
    [t("trx"), gym.has_trx],
    [t("resistanceBands"), gym.has_resistance_band],
    [t("rings"), gym.has_rings],
    [t("gluteHamDeveloper"), gym.has_glute_ham_developer],
  ]
    .filter(([, hasFeature]) => hasFeature)
    .map(([label]) => label as string);

  const cable = [
    { label: t("cableMachine"), value: formatCount(gym.cable_machine_count, t("notListed")) },
  ];

  const cableFeatures = [
    [t("latPulldownCable"), gym.has_lat_pulldown_cable],
    [t("seatedRowCable"), gym.has_seated_row_cable],
  ]
    .filter(([, hasFeature]) => hasFeature)
    .map(([label]) => label as string);

  const fullBodyMachine = [
    { label: t("smithMachine"), value: formatCount(gym.smith_machine_count, t("notListed")) },
  ];

  const armMachines = [
    [t("bicepCurlMachine"), gym.has_bicep_curl_machine],
    [t("tricepExtensionMachine"), gym.has_tricep_extension_machine],
  ]
    .filter(([, hasFeature]) => hasFeature)
    .map(([label]) => label as string);

  const chestMachines = [
    [t("chestPressMachine"), gym.has_chest_press_machine],
    [t("inclineChestPressMachine"), gym.has_incline_chest_press_machine],
    [t("isoLateralChestPressMachine"), gym.has_iso_lateral_chest_press_machine],
    [t("pecDeckMachine"), gym.has_pec_deck_machine],
    [t("chestFlyMachine"), gym.has_chest_fly_machine],
  ]
    .filter(([, hasFeature]) => hasFeature)
    .map(([label]) => label as string);

  const backMachines = [
    [t("latPulldownMachine"), gym.has_lat_pulldown_machine],
    [t("seatedRowMachine"), gym.has_seated_row_machine],
    [t("backExtensionMachine"), gym.has_back_extension_machine],
    [t("isoLateralRowMachine"), gym.has_iso_lateral_row_machine],
    [t("tBarRowMachine"), gym.has_t_bar_row_machine],
  ]
    .filter(([, hasFeature]) => hasFeature)
    .map(([label]) => label as string);

  const shoulderMachines = [
    [t("lateralRaiseMachine"), gym.has_lateral_raise_machine],
    [t("reverseFlyMachine"), gym.has_reverse_fly_machine],
    [t("shoulderPressMachine"), gym.has_shoulder_press_machine],
    [t("isoLateralShoulderPressMachine"), gym.has_iso_lateral_shoulder_press_machine],
  ]
    .filter(([, hasFeature]) => hasFeature)
    .map(([label]) => label as string);

  const legMachines = [
    [t("hipAbductorMachine"), gym.has_hip_abductor_machine],
    [t("hipAdductorMachine"), gym.has_hip_adductor_machine],
    [t("legExtensionMachine"), gym.has_leg_extension_machine],
    [t("legPressMachine"), gym.has_leg_press_machine],
    [t("seatedLegPressMachine"), gym.has_seated_leg_press_machine],
    [t("lyingLegCurlMachine"), gym.has_lying_leg_curl_machine],
    [t("seatedLegCurlMachine"), gym.has_seated_leg_curl_machine],
    [t("seatedCalfRaiseMachine"), gym.has_seated_calf_raise_machine],
    [t("squatMachine"), gym.has_squat_machine],
    [t("standingCalfRaiseMachine"), gym.has_standing_calf_raise_machine],
  ]
    .filter(([, hasFeature]) => hasFeature)
    .map(([label]) => label as string);

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
              href={`/submit?gymId=${gym.id}&returnTo=/gyms/${gym.slug}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("size")} value={gym.size_category ?? t("notListed")} />
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
          <Section title={t("freeWeight")}>
            <ValueGrid items={freeWeight} />
            <div className="mt-4">
              <FeaturePills items={freeWeightFeatures} fallback={t("notListed")} />
            </div>
          </Section>

          <Section title={t("cardio")}>
            <ValueGrid items={cardio} />
          </Section>

          <Section title={t("hyrox")}>
            <ValueGrid items={hyrox} />
          </Section>

          <Section title={t("cable")}>
            <ValueGrid items={cable} />
            <div className="mt-4">
              <FeaturePills items={cableFeatures} fallback={t("notListed")} />
            </div>
          </Section>

          <Section title={t("fullBodyMachine")}>
            <ValueGrid items={fullBodyMachine} />
          </Section>

          <Section title={t("armMachine")}>
            <FeaturePills items={armMachines} fallback={t("notListed")} />
          </Section>

          <Section title={t("chestMachine")}>
            <FeaturePills items={chestMachines} fallback={t("notListed")} />
          </Section>

          <Section title={t("backMachine")}>
            <FeaturePills items={backMachines} fallback={t("notListed")} />
          </Section>

          <Section title={t("shoulderMachine")}>
            <FeaturePills items={shoulderMachines} fallback={t("notListed")} />
          </Section>

          <Section title={t("legMachine")}>
            <FeaturePills items={legMachines} fallback={t("notListed")} />
          </Section>

          <Section title={t("otherEquipment")}>
            <FeaturePills items={otherEquipment} fallback={t("notListed")} />
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
                    <dt className="font-medium text-gray-700">{formatLabel(day)}</dt>
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
