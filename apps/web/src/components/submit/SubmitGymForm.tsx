"use client";

import { FormEvent, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TransientBanner } from "@/components/common/TransientBanner";
import { useRouter } from "@/i18n/navigation";
import { HK_DISTRICTS, type Gym } from "@gymory/shared";

type Status = "idle" | "submitting" | "success" | "error";

type SubmitGymFormProps = {
  gymId?: string;
  initialGym?: Gym | null;
  returnTo?: string;
};

type FeatureFieldName = (typeof FEATURE_FIELD_NAMES)[number];
type FeatureStateMap = Record<FeatureFieldName, boolean | null>;

const FEATURE_FIELD_NAMES = [
  "has_roman_chair",
  "has_dip_station",
  "has_pull_up_bar",
  "has_reverse_hyper",
  "has_trap_bar",
  "has_safety_squat_bar",
  "has_farmer_handles",
  "has_landmine_attachment",
  "has_swiss_bar",
  "has_cambered_bar",
  "has_ez_bar",
  "has_wall_ball",
  "has_sandbag",
  "has_kettlebell",
  "has_lat_pulldown_cable",
  "has_seated_row_cable",
  "has_bicep_curl_machine",
  "has_tricep_extension_machine",
  "has_chest_press_machine",
  "has_incline_chest_press_machine",
  "has_iso_lateral_chest_press_machine",
  "has_pec_deck_machine",
  "has_chest_fly_machine",
  "has_lat_pulldown_machine",
  "has_seated_row_machine",
  "has_back_extension_machine",
  "has_iso_lateral_row_machine",
  "has_t_bar_row_machine",
  "has_lateral_raise_machine",
  "has_reverse_fly_machine",
  "has_shoulder_press_machine",
  "has_iso_lateral_shoulder_press_machine",
  "has_hip_abductor_machine",
  "has_hip_adductor_machine",
  "has_leg_extension_machine",
  "has_leg_press_machine",
  "has_seated_leg_press_machine",
  "has_lying_leg_curl_machine",
  "has_seated_leg_curl_machine",
  "has_seated_calf_raise_machine",
  "has_squat_machine",
  "has_standing_calf_raise_machine",
  "has_battle_rope",
  "has_foam_roller",
  "has_medicine_ball",
  "has_dip_belt",
  "has_weight_vest",
  "has_lifting_straps",
  "has_plyo_box",
  "has_balance_ball",
] as const;

const NUMBER_FIELD_STEPS: Partial<Record<keyof Gym, string>> = {
  dumbbell_max_weight_kg: "0.1",
  plate_min_weight_kg: "0.25",
  plate_max_weight_kg: "0.25",
};

function buildFeatureStateMap(initialGym?: Gym | null): FeatureStateMap {
  return Object.fromEntries(
    FEATURE_FIELD_NAMES.map((name) => [name, initialGym?.[name] ?? null])
  ) as FeatureStateMap;
}

function toNumber(value: string) {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function withFlashParam(path: string, flash: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("flash", flash);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function SubmitGymForm({
  gymId,
  initialGym,
  returnTo,
}: SubmitGymFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("submit");
  const tCommon = useTranslations("common");
  const tGym = useTranslations("gym");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const initialFeatureState = useMemo(
    () => buildFeatureStateMap(initialGym),
    [initialGym]
  );
  const [featureStates, setFeatureStates] = useState<FeatureStateMap>(
    initialFeatureState
  );

  const isUpdate = Boolean(gymId);
  const title = isUpdate ? t("updateTitle") : t("title");
  const description = isUpdate ? t("updateDescription") : t("description");

  const districtOptions = useMemo(
    () =>
      HK_DISTRICTS.map((district) => ({
        value: district.code,
        label: locale === "zh-HK" ? district.nameZh : district.nameEn,
      })),
    [locale]
  );

  function cycleFeatureState(feature: FeatureFieldName) {
    setFeatureStates((current) => {
      const currentValue = current[feature];
      const nextValue =
        currentValue === null ? true : currentValue === true ? false : null;

      return {
        ...current,
        [feature]: nextValue,
      };
    });
  }

  function getDefaultValue(field: keyof Gym) {
    const value = initialGym?.[field];
    return value === null || value === undefined ? "" : String(value);
  }

  const freeWeightFields = [
    ["rack_count", t("rackCount")],
    ["bench_count", t("benchCount")],
    ["barbell_count", t("barbellCount")],
    ["dumbbell_max_weight_kg", t("dumbbellMax")],
    ["plate_min_weight_kg", t("plateMin")],
    ["plate_max_weight_kg", t("plateMax")],
  ];

  const cardioFields = [
    ["treadmill_count", t("treadmillCount")],
    ["assault_bike_count", t("assaultBikeCount")],
    ["exercise_bike_count", t("exerciseBikeCount")],
    ["climber_count", t("climberCount")],
  ];

  const hyroxFields = [
    ["assault_runner_count", t("assaultRunnerCount")],
    ["ski_erg_count", t("skiErgCount")],
    ["rower_count", t("rowerCount")],
    ["sled_count", t("sledCount")],
    ["wall_ball_4kg_count", t("wallBall4kgCount")],
    ["wall_ball_6kg_count", t("wallBall6kgCount")],
    ["wall_ball_9kg_count", t("wallBall9kgCount")],
    ["wall_ball_plate_9ft_count", t("wallBallPlate9ftCount")],
    ["wall_ball_plate_10ft_count", t("wallBallPlate10ftCount")],
    ["sandbag_10kg_count", t("sandbag10kgCount")],
    ["sandbag_20kg_count", t("sandbag20kgCount")],
    ["sandbag_30kg_count", t("sandbag30kgCount")],
    ["kettlebell_16kg_count", t("kettlebell16kgCount")],
    ["kettlebell_24kg_count", t("kettlebell24kgCount")],
    ["kettlebell_32kg_count", t("kettlebell32kgCount")],
  ];

  const machineCountFields = [
    ["cable_machine_count", t("cableMachineCount")],
    ["smith_machine_count", t("smithMachineCount")],
  ];

  const featureSections = [
    {
      title: t("freeWeight"),
      fields: [
        ["has_roman_chair", tGym("romanChair")],
        ["has_dip_station", tGym("dipStation")],
        ["has_pull_up_bar", tGym("pullUpBar")],
        ["has_reverse_hyper", tGym("reverseHyper")],
        ["has_trap_bar", tGym("trapBar")],
        ["has_safety_squat_bar", tGym("safetySquatBar")],
        ["has_farmer_handles", tGym("farmersHandles")],
        ["has_landmine_attachment", tGym("landmineAttachment")],
        ["has_swiss_bar", tGym("swissBar")],
        ["has_cambered_bar", tGym("camberedBar")],
        ["has_ez_bar", tGym("ezBar")],
      ],
    },
    {
      title: t("hyrox"),
      fields: [
        ["has_wall_ball", tGym("wallBall")],
        ["has_sandbag", tGym("sandbag")],
        ["has_kettlebell", tGym("kettlebell")],
      ],
    },
    {
      title: tGym("cable"),
      fields: [
        ["has_lat_pulldown_cable", tGym("latPulldownCable")],
        ["has_seated_row_cable", tGym("seatedRowCable")],
      ],
    },
    {
      title: tGym("armMachine"),
      fields: [
        ["has_bicep_curl_machine", tGym("bicepCurlMachine")],
        ["has_tricep_extension_machine", tGym("tricepExtensionMachine")],
      ],
    },
    {
      title: tGym("chestMachine"),
      fields: [
        ["has_chest_press_machine", tGym("chestPressMachine")],
        ["has_incline_chest_press_machine", tGym("inclineChestPressMachine")],
        ["has_iso_lateral_chest_press_machine", tGym("isoLateralChestPressMachine")],
        ["has_pec_deck_machine", tGym("pecDeckMachine")],
        ["has_chest_fly_machine", tGym("chestFlyMachine")],
      ],
    },
    {
      title: tGym("backMachine"),
      fields: [
        ["has_lat_pulldown_machine", tGym("latPulldownMachine")],
        ["has_seated_row_machine", tGym("seatedRowMachine")],
        ["has_back_extension_machine", tGym("backExtensionMachine")],
        ["has_iso_lateral_row_machine", tGym("isoLateralRowMachine")],
        ["has_t_bar_row_machine", tGym("tBarRowMachine")],
      ],
    },
    {
      title: tGym("shoulderMachine"),
      fields: [
        ["has_lateral_raise_machine", tGym("lateralRaiseMachine")],
        ["has_reverse_fly_machine", tGym("reverseFlyMachine")],
        ["has_shoulder_press_machine", tGym("shoulderPressMachine")],
        ["has_iso_lateral_shoulder_press_machine", tGym("isoLateralShoulderPressMachine")],
      ],
    },
    {
      title: tGym("legMachine"),
      fields: [
        ["has_hip_abductor_machine", tGym("hipAbductorMachine")],
        ["has_hip_adductor_machine", tGym("hipAdductorMachine")],
        ["has_leg_extension_machine", tGym("legExtensionMachine")],
        ["has_leg_press_machine", tGym("legPressMachine")],
        ["has_seated_leg_press_machine", tGym("seatedLegPressMachine")],
        ["has_lying_leg_curl_machine", tGym("lyingLegCurlMachine")],
        ["has_seated_leg_curl_machine", tGym("seatedLegCurlMachine")],
        ["has_seated_calf_raise_machine", tGym("seatedCalfRaiseMachine")],
        ["has_squat_machine", tGym("squatMachine")],
        ["has_standing_calf_raise_machine", tGym("standingCalfRaiseMachine")],
      ],
    },
    {
      title: tGym("otherEquipment"),
      fields: [
        ["has_battle_rope", tGym("battleRope")],
        ["has_foam_roller", tGym("foamRoller")],
        ["has_medicine_ball", tGym("medicineBall")],
        ["has_dip_belt", tGym("dipBelt")],
        ["has_weight_vest", tGym("weightVest")],
        ["has_lifting_straps", tGym("liftingStraps")],
        ["has_plyo_box", tGym("plyoBox")],
        ["has_balance_ball", tGym("balanceBall")],
      ],
    },
  ];

  const featureNames = featureSections.flatMap((section) =>
    section.fields.map(([name]) => name)
  );

  function renderNumberFields(fields: string[][]) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map(([name, label]) => (
          <label key={name} className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <input
              name={name}
              type="number"
              min={0}
              step={NUMBER_FIELD_STEPS[name as keyof Gym] ?? "1"}
              defaultValue={getDefaultValue(name as keyof Gym)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </label>
        ))}
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(form);
    const payload = {
      gym: {
        name: formData.get("name"),
        name_zh: formData.get("name_zh") || null,
        address: formData.get("address") || null,
        address_zh: formData.get("address_zh") || null,
        district_code: formData.get("district_code") || null,
        country_code: "HK",
        website_url: formData.get("website_url") || null,
        notes: formData.get("notes") || null,
      },
      equipment: {
        rack_count: toNumber(String(formData.get("rack_count") ?? "")),
        bench_count: toNumber(String(formData.get("bench_count") ?? "")),
        barbell_count: toNumber(String(formData.get("barbell_count") ?? "")),
        dumbbell_max_weight_kg: toNumber(
          String(formData.get("dumbbell_max_weight_kg") ?? "")
        ),
        plate_min_weight_kg: toNumber(
          String(formData.get("plate_min_weight_kg") ?? "")
        ),
        plate_max_weight_kg: toNumber(
          String(formData.get("plate_max_weight_kg") ?? "")
        ),
        treadmill_count: toNumber(String(formData.get("treadmill_count") ?? "")),
        assault_bike_count: toNumber(
          String(formData.get("assault_bike_count") ?? "")
        ),
        exercise_bike_count: toNumber(
          String(formData.get("exercise_bike_count") ?? "")
        ),
        climber_count: toNumber(String(formData.get("climber_count") ?? "")),
        assault_runner_count: toNumber(
          String(formData.get("assault_runner_count") ?? "")
        ),
        ski_erg_count: toNumber(String(formData.get("ski_erg_count") ?? "")),
        rower_count: toNumber(String(formData.get("rower_count") ?? "")),
        sled_count: toNumber(String(formData.get("sled_count") ?? "")),
        wall_ball_4kg_count: toNumber(
          String(formData.get("wall_ball_4kg_count") ?? "")
        ),
        wall_ball_6kg_count: toNumber(
          String(formData.get("wall_ball_6kg_count") ?? "")
        ),
        wall_ball_9kg_count: toNumber(
          String(formData.get("wall_ball_9kg_count") ?? "")
        ),
        wall_ball_plate_9ft_count: toNumber(
          String(formData.get("wall_ball_plate_9ft_count") ?? "")
        ),
        wall_ball_plate_10ft_count: toNumber(
          String(formData.get("wall_ball_plate_10ft_count") ?? "")
        ),
        sandbag_10kg_count: toNumber(
          String(formData.get("sandbag_10kg_count") ?? "")
        ),
        sandbag_20kg_count: toNumber(
          String(formData.get("sandbag_20kg_count") ?? "")
        ),
        sandbag_30kg_count: toNumber(
          String(formData.get("sandbag_30kg_count") ?? "")
        ),
        kettlebell_16kg_count: toNumber(
          String(formData.get("kettlebell_16kg_count") ?? "")
        ),
        kettlebell_24kg_count: toNumber(
          String(formData.get("kettlebell_24kg_count") ?? "")
        ),
        kettlebell_32kg_count: toNumber(
          String(formData.get("kettlebell_32kg_count") ?? "")
        ),
        cable_machine_count: toNumber(
          String(formData.get("cable_machine_count") ?? "")
        ),
        smith_machine_count: toNumber(
          String(formData.get("smith_machine_count") ?? "")
        ),
        ...Object.fromEntries(
          featureNames.map((name) => [
            name,
            featureStates[name as FeatureFieldName] ?? null,
          ])
        ),
      },
    };

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymId,
          submissionType: isUpdate ? "edit_equipment" : "add_gym",
          payload,
        }),
      });

      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as
          | { error?: string | { formErrors?: string[] } }
          | null;
        const serverError =
          typeof responseBody?.error === "string"
            ? responseBody.error
            : responseBody?.error?.formErrors?.[0];

        throw new Error(serverError ?? t("errorMessage"));
      }

      form.reset();
      setFeatureStates(initialFeatureState);
      router.push(
        withFlashParam(isUpdate && returnTo ? returnTo : "/", "submission-success")
      );
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : t("errorMessage"));
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-500">{description}</p>
      </div>

      {status === "error" && (
        <TransientBanner key={errorMessage} message={errorMessage} tone="error" />
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border border-gray-200 bg-white p-5"
      >
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-gray-900">
            {t("gymInfo")}
          </legend>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                {t("gymName")}
              </span>
              <input
                name="name"
                required={!isUpdate}
                defaultValue={getDefaultValue("name")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                {t("gymNameZh")}
              </span>
              <input
                name="name_zh"
                defaultValue={getDefaultValue("name_zh")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">
              {t("address")}
            </span>
            <input
              name="address"
              required={!isUpdate}
              defaultValue={getDefaultValue("address")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">
              {t("addressZh")}
            </span>
            <input
              name="address_zh"
              defaultValue={getDefaultValue("address_zh")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                {t("district")}
              </span>
              <select
                name="district_code"
                required={!isUpdate}
                defaultValue={getDefaultValue("district_code")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">{t("selectDistrict")}</option>
                {districtOptions.map((district) => (
                  <option key={district.value} value={district.value}>
                    {district.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                {t("website")}
              </span>
              <input
                name="website_url"
                type="url"
                placeholder="https://"
                defaultValue={getDefaultValue("website_url")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-6 border-t border-gray-200 pt-6">
          <legend className="text-lg font-semibold text-gray-900">
            {t("equipment")}
          </legend>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">{t("freeWeight")}</h2>
            {renderNumberFields(freeWeightFields)}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">{t("cardio")}</h2>
            {renderNumberFields(cardioFields)}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">{t("hyrox")}</h2>
            {renderNumberFields(hyroxFields)}
          </div>

          <details className="rounded-lg border border-gray-200 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-900">
              {t("machineOptional")}
            </summary>
            <div className="mt-4 space-y-5">
              <p className="text-sm text-gray-500">{t("featureStateHint")}</p>
              {renderNumberFields(machineCountFields)}
              {featureSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    {section.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {section.fields.map(([name, label]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => cycleFeatureState(name as FeatureFieldName)}
                        className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                          featureStates[name as FeatureFieldName] === true
                            ? "border-gray-900 bg-gray-900 text-white"
                            : featureStates[name as FeatureFieldName] === false
                              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {label}
                        <span className="ml-1.5 text-xs font-semibold uppercase tracking-wide">
                          {featureStates[name as FeatureFieldName] === true
                            ? tCommon("yes")
                            : featureStates[name as FeatureFieldName] === false
                              ? tCommon("no")
                              : tCommon("unknown")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </fieldset>

        <label className="block space-y-1.5 border-t border-gray-200 pt-6">
          <span className="text-sm font-medium text-gray-700">
            {t("notes")}
          </span>
          <textarea
            name="notes"
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </label>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={status === "submitting"}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {status === "submitting" ? t("submitting") : t("submitButton")}
          </button>
        </div>
      </form>
    </div>
  );
}
