"use client";

import { FormEvent, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EQUIPMENT_TAGS, HK_DISTRICTS } from "@gymory/shared";

type Status = "idle" | "submitting" | "success" | "error";

type SubmitGymFormProps = {
  gymId?: string;
};

function toNumber(value: string) {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatTag(tag: string) {
  return tag
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function SubmitGymForm({ gymId }: SubmitGymFormProps) {
  const locale = useLocale();
  const t = useTranslations("submit");
  const tGym = useTranslations("gym");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

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

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  }

  function toggleFeature(feature: string) {
    setSelectedFeatures((current) =>
      current.includes(feature)
        ? current.filter((item) => item !== feature)
        : [...current, feature]
    );
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </label>
        ))}
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
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
        cable_machine_count: toNumber(
          String(formData.get("cable_machine_count") ?? "")
        ),
        smith_machine_count: toNumber(
          String(formData.get("smith_machine_count") ?? "")
        ),
        ...Object.fromEntries(
          featureNames.map((name) => [name, selectedFeatures.includes(name)])
        ),
      },
      equipment_tags: selectedTags,
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
        throw new Error(t("errorMessage"));
      }

      setStatus("success");
      event.currentTarget.reset();
      setSelectedTags([]);
      setSelectedFeatures([]);
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

      {status === "success" && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {t("successMessage")}
        </div>
      )}

      {status === "error" && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                {t("gymNameZh")}
              </span>
              <input
                name="name_zh"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">
              {t("addressZh")}
            </span>
            <input
              name="address_zh"
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
                        onClick={() => toggleFeature(name)}
                        className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                          selectedFeatures.includes(name)
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </fieldset>

        <fieldset className="space-y-3 border-t border-gray-200 pt-6">
          <legend className="text-lg font-semibold text-gray-900">
            {t("equipmentTags")}
          </legend>

          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {formatTag(tag)}
              </button>
            ))}
          </div>
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

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {status === "submitting" ? t("submitting") : t("submitButton")}
        </button>
      </form>
    </div>
  );
}
