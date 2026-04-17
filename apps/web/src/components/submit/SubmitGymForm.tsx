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
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
        dumbbell_max_weight_kg: toNumber(
          String(formData.get("dumbbell_max_weight_kg") ?? "")
        ),
        assault_bike_count: toNumber(
          String(formData.get("assault_bike_count") ?? "")
        ),
        ski_erg_count: toNumber(String(formData.get("ski_erg_count") ?? "")),
        rower_count: toNumber(String(formData.get("rower_count") ?? "")),
        sled_count: toNumber(String(formData.get("sled_count") ?? "")),
        wall_ball_count: toNumber(String(formData.get("wall_ball_count") ?? "")),
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

        <fieldset className="space-y-4 border-t border-gray-200 pt-6">
          <legend className="text-lg font-semibold text-gray-900">
            {t("equipment")}
          </legend>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["rack_count", t("rackCount")],
              ["dumbbell_max_weight_kg", t("dumbbellMax")],
              ["assault_bike_count", t("assaultBikeCount")],
              ["ski_erg_count", t("skiErgCount")],
              ["rower_count", t("rowerCount")],
              ["sled_count", t("sledCount")],
              ["wall_ball_count", t("wallBallCount")],
            ].map(([name, label]) => (
              <label key={name} className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">
                  {label}
                </span>
                <input
                  name={name}
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </label>
            ))}
          </div>
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
