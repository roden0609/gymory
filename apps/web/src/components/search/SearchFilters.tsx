"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getTrainingPageDefinition } from "@/lib/training-pages";
import { EQUIPMENT_BRANDS, HK_DISTRICTS } from "@gymory/shared";

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
  {
    titleKey: "amenities",
    filters: [
      { labelKey: "washroom", param: "hasWashroom" },
      { labelKey: "bathroom", param: "hasBathroom" },
    ],
  },
];

const ALL_CHECKBOX_FILTERS = CHECKBOX_SECTIONS.flatMap(
  (section) => section.filters
);

const FILTER_DEBOUNCE_MS = 300;

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("search");
  const tCommon = useTranslations("common");
  const tGym = useTranslations("gym");
  const tTraining = useTranslations("trainingPages");

  const [collection, setCollection] = useState(
    searchParams.get("collection") ?? ""
  );
  const [district, setDistrict] = useState(searchParams.get("district") ?? "");
  const currentView = searchParams.get("view");
  const [minRackCount, setMinRackCount] = useState(
    searchParams.get("minRackCount") ?? ""
  );
  const [minPlatformCount, setMinPlatformCount] = useState(
    searchParams.get("minPlatformCount") ?? ""
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
  const [selectedBrandSlugs, setSelectedBrandSlugs] = useState<string[]>(
    () =>
      (searchParams.get("brandSlugs") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const activeFilterCount = useMemo(
    () =>
      Number(Boolean(district)) +
      Number(Boolean(minRackCount)) +
      Number(Boolean(minPlatformCount)) +
      Number(Boolean(minDumbbellWeight)) +
      Number(Boolean(minPlateWeight)) +
      Number(Boolean(collection)) +
      selectedFilters.size +
      selectedBrandSlugs.length,
    [
      collection,
      district,
      minDumbbellWeight,
      minPlateWeight,
      minPlatformCount,
      minRackCount,
      selectedBrandSlugs.length,
      selectedFilters,
    ]
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

  const toggleBrand = useCallback((slug: string, checked: boolean) => {
    setSelectedBrandSlugs((current) => {
      if (checked) {
        if (current.includes(slug)) return current;
        return [...current, slug];
      }
      return current.filter((value) => value !== slug);
    });
  }, []);

  const nextQueryString = useMemo(() => {
    const params = new URLSearchParams();
    const userLat = searchParams.get("userLat");
    const userLng = searchParams.get("userLng");
    if (currentView === "map" || currentView === "split") {
      params.set("view", currentView);
    }
    if (userLat && userLng) {
      params.set("userLat", userLat);
      params.set("userLng", userLng);
    }
    if (collection) params.set("collection", collection);
    if (district) params.set("district", district);
    if (minRackCount) params.set("minRackCount", minRackCount);
    if (minPlatformCount) {
      params.set("minPlatformCount", minPlatformCount);
    }
    if (minDumbbellWeight) {
      params.set("minDumbbellWeight", minDumbbellWeight);
    }
    if (minPlateWeight) params.set("minPlateWeight", minPlateWeight);
    if (selectedBrandSlugs.length > 0) {
      params.set("brandSlugs", selectedBrandSlugs.join(","));
    }
    selectedFilters.forEach((param) => params.set(param, "true"));
    return params.toString();
  }, [
    collection,
    currentView,
    district,
    minDumbbellWeight,
    minPlateWeight,
    minPlatformCount,
    minRackCount,
    searchParams,
    selectedBrandSlugs,
    selectedFilters,
  ]);

  useEffect(() => {
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete("page");
    currentParams.delete("pageSize");
    const currentFilterQuery = currentParams.toString();

    if (nextQueryString === currentFilterQuery) return;

    const timer = window.setTimeout(() => {
      router.replace(nextQueryString ? `/search?${nextQueryString}` : "/search");
    }, FILTER_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [nextQueryString, router, searchParams]);

  const applyFiltersNow = useCallback(() => {
    router.replace(nextQueryString ? `/search?${nextQueryString}` : "/search");
  }, [nextQueryString, router]);

  const clearFilters = useCallback(() => {
    setDistrict("");
    setMinRackCount("");
    setMinPlatformCount("");
    setMinDumbbellWeight("");
    setMinPlateWeight("");
    setCollection("");
    setSelectedBrandSlugs([]);
    setSelectedFilters(new Set());
  }, []);

  const applyLocationParams = useCallback(
    (lat: number, lng: number) => {
      const params = new URLSearchParams(nextQueryString);
      params.set("userLat", lat.toFixed(6));
      params.set("userLng", lng.toFixed(6));
      params.delete("page");
      params.delete("pageSize");
      router.replace(params.toString() ? `/search?${params.toString()}` : "/search");
    },
    [nextQueryString, router]
  );

  const clearLocation = useCallback(() => {
    const params = new URLSearchParams(nextQueryString);
    params.delete("userLat");
    params.delete("userLng");
    params.delete("page");
    params.delete("pageSize");
    setLocationError(null);
    router.replace(params.toString() ? `/search?${params.toString()}` : "/search");
  }, [nextQueryString, router]);

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t("locationUnsupported"));
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        applyLocationParams(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(t("locationPermissionDenied"));
          return;
        }
        if (error.code === error.TIMEOUT) {
          setLocationError(t("locationTimeout"));
          return;
        }
        setLocationError(t("locationFailed"));
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000,
      }
    );
  }, [applyLocationParams, t]);

  const hasUserLocation =
    Boolean(searchParams.get("userLat")) && Boolean(searchParams.get("userLng"));
  const activeCollection = collection
    ? getTrainingPageDefinition(collection)
    : null;

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

        {activeCollection && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase text-gray-500">
              {t("collectionFilter")}
            </p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-gray-900">
                {tTraining(`items.${activeCollection.slug}.h1`)}
              </p>
              <button
                type="button"
                onClick={() => setCollection("")}
                className="shrink-0 text-sm font-medium text-gray-500 underline underline-offset-4 hover:text-gray-900"
              >
                {t("clearCollection")}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={requestUserLocation}
              disabled={isLocating}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLocating ? t("locating") : t("useMyLocation")}
            </button>
            {hasUserLocation && (
              <button
                type="button"
                onClick={clearLocation}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                {t("clearLocation")}
              </button>
            )}
          </div>
          {locationError && (
            <p className="text-xs text-red-600">{locationError}</p>
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
            label={t("minPlatforms")}
            value={minPlatformCount}
            placeholder="e.g. 2"
            onChange={setMinPlatformCount}
          />
          <NumberFilter
            label={t("maxDumbbell")}
            value={minDumbbellWeight}
            placeholder="e.g. 40"
            step="0.1"
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

        <FilterSection title={tGym("equipmentBrands")}>
          <p className="mb-2 text-xs text-gray-500">{t("brandOrHint")}</p>
          <div className="grid gap-2">
            {EQUIPMENT_BRANDS.map((brand) => {
              const label =
                locale === "zh-HK" && brand.name_zh ? brand.name_zh : brand.name_en;
              return (
                <CheckboxFilter
                  key={brand.slug}
                  label={label}
                  checked={selectedBrandSlugs.includes(brand.slug)}
                  onChange={(checked) => toggleBrand(brand.slug, checked)}
                />
              );
            })}
          </div>
        </FilterSection>

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={applyFiltersNow}
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
