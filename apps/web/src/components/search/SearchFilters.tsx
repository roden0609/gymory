"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { HK_DISTRICTS } from "@gymory/shared";

type CheckboxFilter = {
  labelKey: string;
  param: string;
};

type CheckboxSection = {
  titleKey: string;
  defaultOpen?: boolean;
  filters: CheckboxFilter[];
};

const CHECKBOX_SECTIONS: CheckboxSection[] = [
  {
    titleKey: "hyrox",
    defaultOpen: true,
    filters: [
      { labelKey: "assaultBike", param: "hasAssaultBike" },
      { labelKey: "skiErg", param: "hasSkiErg" },
      { labelKey: "rower", param: "hasRower" },
      { labelKey: "sled", param: "hasSled" },
      { labelKey: "wallBallPlate", param: "hasWallBallPlate" },
      { labelKey: "sandbag", param: "hasSandbag" },
      { labelKey: "kettlebell", param: "hasKettlebell" },
    ],
  },
  {
    titleKey: "cardio",
    filters: [
      { labelKey: "treadmill", param: "hasTreadmill" },
      { labelKey: "exerciseBike", param: "hasExerciseBike" },
      { labelKey: "climber", param: "hasClimber" },
    ],
  },
  {
    titleKey: "cable",
    filters: [
      { labelKey: "cableMachine", param: "hasCableMachine" },
      { labelKey: "latPulldownCable", param: "hasLatPulldownCable" },
      { labelKey: "seatedRowCable", param: "hasSeatedRowCable" },
    ],
  },
  {
    titleKey: "fullBodyMachine",
    filters: [{ labelKey: "smithMachine", param: "hasSmithMachine" }],
  },
  {
    titleKey: "armMachine",
    filters: [
      { labelKey: "bicepCurlMachine", param: "hasBicepCurlMachine" },
      { labelKey: "tricepExtensionMachine", param: "hasTricepExtensionMachine" },
    ],
  },
  {
    titleKey: "chestMachine",
    filters: [
      { labelKey: "chestPressMachine", param: "hasChestPressMachine" },
      {
        labelKey: "inclineChestPressMachine",
        param: "hasInclineChestPressMachine",
      },
      {
        labelKey: "isoLateralChestPressMachine",
        param: "hasIsoLateralChestPressMachine",
      },
      { labelKey: "pecDeckMachine", param: "hasPecDeckMachine" },
      { labelKey: "chestFlyMachine", param: "hasChestFlyMachine" },
    ],
  },
  {
    titleKey: "backMachine",
    filters: [
      { labelKey: "latPulldownMachine", param: "hasLatPulldownMachine" },
      { labelKey: "seatedRowMachine", param: "hasSeatedRowMachine" },
      { labelKey: "backExtensionMachine", param: "hasBackExtensionMachine" },
      { labelKey: "isoLateralRowMachine", param: "hasIsoLateralRowMachine" },
      { labelKey: "tBarRowMachine", param: "hasTBarRowMachine" },
    ],
  },
  {
    titleKey: "shoulderMachine",
    filters: [
      { labelKey: "lateralRaiseMachine", param: "hasLateralRaiseMachine" },
      { labelKey: "reverseFlyMachine", param: "hasReverseFlyMachine" },
      { labelKey: "shoulderPressMachine", param: "hasShoulderPressMachine" },
      {
        labelKey: "isoLateralShoulderPressMachine",
        param: "hasIsoLateralShoulderPressMachine",
      },
    ],
  },
  {
    titleKey: "legMachine",
    filters: [
      { labelKey: "hipAbductorMachine", param: "hasHipAbductorMachine" },
      { labelKey: "hipAdductorMachine", param: "hasHipAdductorMachine" },
      { labelKey: "legExtensionMachine", param: "hasLegExtensionMachine" },
      { labelKey: "legPressMachine", param: "hasLegPressMachine" },
      { labelKey: "seatedLegPressMachine", param: "hasSeatedLegPressMachine" },
      { labelKey: "lyingLegCurlMachine", param: "hasLyingLegCurlMachine" },
      { labelKey: "seatedLegCurlMachine", param: "hasSeatedLegCurlMachine" },
      { labelKey: "seatedCalfRaiseMachine", param: "hasSeatedCalfRaiseMachine" },
      { labelKey: "squatMachine", param: "hasSquatMachine" },
      {
        labelKey: "standingCalfRaiseMachine",
        param: "hasStandingCalfRaiseMachine",
      },
    ],
  },
  {
    titleKey: "otherEquipment",
    filters: [
      { labelKey: "battleRope", param: "hasBattleRope" },
      { labelKey: "foamRoller", param: "hasFoamRoller" },
      { labelKey: "medicineBall", param: "hasMedicineBall" },
      { labelKey: "dipBelt", param: "hasDipBelt" },
      { labelKey: "weightVest", param: "hasWeightVest" },
      { labelKey: "liftingStraps", param: "hasLiftingStraps" },
      { labelKey: "plyoBox", param: "hasPlyoBox" },
      { labelKey: "balanceBall", param: "hasBalanceBall" },
    ],
  },
];

const ALL_CHECKBOX_FILTERS = CHECKBOX_SECTIONS.flatMap(
  (section) => section.filters
);

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("search");
  const tCommon = useTranslations("common");
  const tGym = useTranslations("gym");

  const [district, setDistrict] = useState(searchParams.get("district") ?? "");
  const [minRackCount, setMinRackCount] = useState(
    searchParams.get("minRackCount") ?? ""
  );
  const [minDumbbellWeight, setMinDumbbellWeight] = useState(
    searchParams.get("minDumbbellWeight") ?? ""
  );
  const [minPlateWeight, setMinPlateWeight] = useState(
    searchParams.get("minPlateWeight") ?? ""
  );
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    () =>
      new Set(
        ALL_CHECKBOX_FILTERS.filter(
          (filter) => searchParams.get(filter.param) === "true"
        ).map((filter) => filter.param)
      )
  );

  const activeFilterCount = useMemo(
    () =>
      Number(Boolean(district)) +
      Number(Boolean(minRackCount)) +
      Number(Boolean(minDumbbellWeight)) +
      Number(Boolean(minPlateWeight)) +
      selectedFilters.size,
    [district, minDumbbellWeight, minPlateWeight, minRackCount, selectedFilters]
  );

  const toggleFilter = useCallback((param: string, checked: boolean) => {
    setSelectedFilters((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(param);
      } else {
        next.delete(param);
      }
      return next;
    });
  }, []);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (district) params.set("district", district);
    if (minRackCount) params.set("minRackCount", minRackCount);
    if (minDumbbellWeight) {
      params.set("minDumbbellWeight", minDumbbellWeight);
    }
    if (minPlateWeight) params.set("minPlateWeight", minPlateWeight);
    params.delete("page");
    params.delete("pageSize");
    selectedFilters.forEach((param) => params.set(param, "true"));

    const queryString = params.toString();
    router.push(queryString ? `/search?${queryString}` : "/search");
  }, [
    district,
    minDumbbellWeight,
    minPlateWeight,
    minRackCount,
    router,
    selectedFilters,
  ]);

  const clearFilters = useCallback(() => {
    setDistrict("");
    setMinRackCount("");
    setMinDumbbellWeight("");
    setMinPlateWeight("");
    setSelectedFilters(new Set());
    router.push("/search");
  }, [router]);

  return (
    <aside className="w-full shrink-0 md:w-72">
      <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">{t("filters")}</h2>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            {t("district")}
          </label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">{t("anyDistrict")}</option>
            {HK_DISTRICTS.map((d) => (
              <option key={d.code} value={d.code}>
                {locale === "zh-HK" ? d.nameZh : d.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {tGym("freeWeight")}
          </h3>
          <NumberFilter
            label={t("minRacks")}
            value={minRackCount}
            placeholder="e.g. 4"
            onChange={setMinRackCount}
          />
          <NumberFilter
            label={t("maxDumbbell")}
            value={minDumbbellWeight}
            placeholder="e.g. 40"
            onChange={setMinDumbbellWeight}
          />
          <NumberFilter
            label={t("smallestPlate")}
            value={minPlateWeight}
            placeholder="e.g. 1.25"
            step="0.25"
            onChange={setMinPlateWeight}
          />
        </div>

        <div className="space-y-3">
          {CHECKBOX_SECTIONS.map((section) => (
            <FilterSection
              key={section.titleKey}
              title={tGym(section.titleKey)}
              defaultOpen={section.defaultOpen}
            >
              {section.filters.map((filter) => (
                <CheckboxFilter
                  key={filter.param}
                  label={tGym(filter.labelKey)}
                  checked={selectedFilters.has(filter.param)}
                  onChange={(checked) => toggleFilter(filter.param, checked)}
                />
              ))}
            </FilterSection>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={applyFilters}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            {tCommon("search")}
          </button>
          <button
            onClick={clearFilters}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            {tCommon("clear")}
          </button>
        </div>
      </div>
    </aside>
  );
}

function NumberFilter({
  label,
  value,
  placeholder,
  step = "1",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  step?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
    </div>
  );
}

function FilterSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-gray-200 px-3 py-2"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-gray-900">
        <span>{title}</span>
        <span className="text-gray-400 transition-transform group-open:rotate-180">
          v
        </span>
      </summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  );
}

function CheckboxFilter({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
      />
      <span className="text-sm leading-5 text-gray-700">{label}</span>
    </label>
  );
}
