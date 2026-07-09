"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  trackDistrictFilter,
  trackEquipmentBrandFilter,
  trackEquipmentFilter,
  trackFilterApply,
  trackGymBrandFilter,
} from "@/lib/analytics";
import { getTrainingPageDefinition } from "@/lib/training-pages";
import { EQUIPMENT_BRANDS, GYM_CHAINS } from "@gymory/shared";

type CheckboxFilter = {
  labelKey: string;
  param: string;
};

type CheckboxSection = {
  titleKey: string;
  defaultOpen?: boolean;
  filters: CheckboxFilter[];
};

const FREE_WEIGHT_FILTERS: CheckboxFilter[] = [
  { labelKey: "deadliftPlatform", param: "hasDeadliftPlatform" },
  { labelKey: "pullUpBar", param: "hasPullUpBar" },
  { labelKey: "dipStation", param: "hasDipStation" },
  { labelKey: "trapBar", param: "hasTrapBar" },
  { labelKey: "safetySquatBar", param: "hasSafetySquatBar" },
  { labelKey: "landmineAttachment", param: "hasLandmineAttachment" },
  { labelKey: "swissBar", param: "hasSwissBar" },
  { labelKey: "camberedBar", param: "hasCamberedBar" },
  { labelKey: "ezBar", param: "hasEzBar" },
  { labelKey: "gluteHamDeveloper", param: "hasGluteHamDeveloper" },
  { labelKey: "reverseHyper", param: "hasReverseHyper" },
];

const CHECKBOX_SECTIONS: CheckboxSection[] = [
  {
    titleKey: "hyrox",
    filters: [
      { labelKey: "hyroxOfficial", param: "isHyroxOfficial" },
      { labelKey: "assaultRunner", param: "hasAssaultRunner" },
      { labelKey: "assaultBike", param: "hasAssaultBike" },
      { labelKey: "skiErg", param: "hasSkiErg" },
      { labelKey: "rower", param: "hasRower" },
      { labelKey: "sled", param: "hasSled" },
      { labelKey: "wallBall", param: "hasWallBall" },
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
      { labelKey: "ellipticalMachine", param: "hasEllipticalMachine" },
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
    titleKey: "coreMachine",
    filters: [
      { labelKey: "romanChair", param: "hasRomanChair" },
      { labelKey: "abCrunchBench", param: "hasAbCrunchBench" },
      { labelKey: "torsoRotationMachine", param: "hasTorsoRotationMachine" },
      { labelKey: "abCrunchMachine", param: "hasAbCrunchMachine" },
    ],
  },
  {
    titleKey: "armMachine",
    filters: [
      { labelKey: "preacherCurlBench", param: "hasPreacherCurlBench" },
      { labelKey: "bicepCurlMachine", param: "hasBicepCurlMachine" },
      { labelKey: "tricepExtensionMachine", param: "hasTricepExtensionMachine" },
      { labelKey: "dipMachine", param: "hasDipMachine" },
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
        labelKey: "declineChestPressMachine",
        param: "hasDeclineChestPressMachine",
      },
      { labelKey: "benchRack", param: "hasBenchRack" },
      { labelKey: "inclineBenchRack", param: "hasInclineBenchRack" },
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
      { labelKey: "pullOverMachine", param: "hasPullOverMachine" },
    ],
  },
  {
    titleKey: "shoulderMachine",
    filters: [
      { labelKey: "lateralRaiseMachine", param: "hasLateralRaiseMachine" },
      {
        labelKey: "standingLateralRaiseMachine",
        param: "hasStandingLateralRaiseMachine",
      },
      { labelKey: "reverseFlyMachine", param: "hasReverseFlyMachine" },
      { labelKey: "shoulderPressMachine", param: "hasShoulderPressMachine" },
      {
        labelKey: "isoLateralShoulderPressMachine",
        param: "hasIsoLateralShoulderPressMachine",
      },
      { labelKey: "multiPressMachine", param: "hasMultiPressMachine" },
    ],
  },
  {
    titleKey: "legMachine",
    filters: [
      { labelKey: "multiHipMachine", param: "hasMultiHipMachine" },
      { labelKey: "hipAbductorMachine", param: "hasHipAbductorMachine" },
      { labelKey: "hipAdductorMachine", param: "hasHipAdductorMachine" },
      { labelKey: "legExtensionMachine", param: "hasLegExtensionMachine" },
      { labelKey: "legPressMachine", param: "hasLegPressMachine" },
      { labelKey: "seatedLegPressMachine", param: "hasSeatedLegPressMachine" },
      { labelKey: "lyingLegCurlMachine", param: "hasLyingLegCurlMachine" },
      { labelKey: "seatedLegCurlMachine", param: "hasSeatedLegCurlMachine" },
      { labelKey: "seatedCalfRaiseMachine", param: "hasSeatedCalfRaiseMachine" },
      { labelKey: "squatMachine", param: "hasSquatMachine" },
      { labelKey: "hackSquatMachine", param: "hasHackSquat" },
      { labelKey: "beltSquatMachine", param: "hasBeltSquatMachine" },
      {
        labelKey: "standingCalfRaiseMachine",
        param: "hasStandingCalfRaiseMachine",
      },
      { labelKey: "gluteExtensionMachine", param: "hasGluteExtensionMachine" },
      { labelKey: "hipThrustMachine", param: "hasHipThrustMachine" },
    ],
  },
  {
    titleKey: "otherEquipment",
    filters: [
      { labelKey: "boxingSandbag", param: "hasBoxingSandbag" },
      { labelKey: "battleRope", param: "hasBattleRope" },
      { labelKey: "foamRoller", param: "hasFoamRoller" },
      { labelKey: "medicineBall", param: "hasMedicineBall" },
      { labelKey: "exerciseStepper", param: "hasExerciseStepper" },
      { labelKey: "abRoller", param: "hasAbRoller" },
      { labelKey: "massageBall", param: "hasMassageBall" },
      { labelKey: "dipBelt", param: "hasDipBelt" },
      { labelKey: "weightVest", param: "hasWeightVest" },
      { labelKey: "liftingStraps", param: "hasLiftingStraps" },
      { labelKey: "plyoBox", param: "hasPlyoBox" },
      { labelKey: "balanceBall", param: "hasBalanceBall" },
      { labelKey: "trx", param: "hasTrx" },
      { labelKey: "resistanceBands", param: "hasResistanceBand" },
      { labelKey: "rings", param: "hasRings" },
      { labelKey: "yogaBlock", param: "hasYogaBlock" },
      { labelKey: "yogaMat", param: "hasYogaMat" },
      { labelKey: "stretchingMachine", param: "hasStretchingMachine" },
      { labelKey: "mobilityStick", param: "hasMobilityStick" },
    ],
  },
  {
    titleKey: "amenities",
    filters: [
      { labelKey: "washroom", param: "hasWashroom" },
      { labelKey: "bathroom", param: "hasBathroom" },
      { labelKey: "changingRoom", param: "hasChangingRoom" },
      { labelKey: "freeWater", param: "hasFreeWater" },
      { labelKey: "drySauna", param: "hasDrySauna" },
      { labelKey: "wetSauna", param: "hasWetSauna" },
      { labelKey: "iceBath", param: "hasIceBath" },
    ],
  },
];

const ALL_CHECKBOX_FILTERS = [
  ...FREE_WEIGHT_FILTERS,
  ...CHECKBOX_SECTIONS.flatMap((section) => section.filters),
];

const FILTER_DEBOUNCE_MS = 300;

const EQUIPMENT_FILTER_SLUGS: Record<string, string> = {
  isHyroxOfficial: "hyrox-official",
  hasAssaultRunner: "assault-runner",
  hasAssaultBike: "assault-bike",
  hasSkiErg: "ski-erg",
  hasRower: "rower",
  hasSled: "sled",
  hasWallBall: "wall-ball",
  hasWallBallPlate: "wall-ball",
  hasSandbag: "sandbag",
  hasKettlebell: "kettlebell",
  hasTreadmill: "treadmill",
  hasExerciseBike: "exercise-bike",
  hasClimber: "climber",
  hasEllipticalMachine: "elliptical-machine",
  hasDeadliftPlatform: "deadlift-platform",
  hasPullUpBar: "pull-up-bar",
  hasDipStation: "dip-station",
  hasTrapBar: "trap-bar",
  hasSafetySquatBar: "safety-squat-bar",
  hasLandmineAttachment: "landmine-attachment",
  hasSwissBar: "swiss-bar",
  hasCamberedBar: "cambered-bar",
  hasEzBar: "ez-bar",
  hasGluteHamDeveloper: "glute-ham-developer",
  hasReverseHyper: "reverse-hyper",
  hasCableMachine: "cable-machine",
  hasLatPulldownCable: "lat-pulldown-cable",
  hasSeatedRowCable: "seated-row-cable",
  hasSmithMachine: "smith-machine",
  hasRomanChair: "roman-chair",
  hasAbCrunchBench: "ab-crunch-bench",
  hasTorsoRotationMachine: "torso-rotation-machine",
  hasAbCrunchMachine: "ab-crunch-machine",
  hasPreacherCurlBench: "preacher-curl-bench",
  hasBicepCurlMachine: "bicep-curl-machine",
  hasTricepExtensionMachine: "tricep-extension-machine",
  hasDipMachine: "dip-machine",
  hasChestPressMachine: "chest-press-machine",
  hasInclineChestPressMachine: "incline-chest-press-machine",
  hasDeclineChestPressMachine: "decline-chest-press-machine",
  hasBenchRack: "bench-rack",
  hasInclineBenchRack: "incline-bench-rack",
  hasIsoLateralChestPressMachine: "iso-lateral-chest-press-machine",
  hasPecDeckMachine: "pec-deck-machine",
  hasChestFlyMachine: "chest-fly-machine",
  hasLatPulldownMachine: "lat-pulldown-machine",
  hasSeatedRowMachine: "seated-row-machine",
  hasBackExtensionMachine: "back-extension-machine",
  hasIsoLateralRowMachine: "iso-lateral-row-machine",
  hasTBarRowMachine: "t-bar-row-machine",
  hasPullOverMachine: "pull-over-machine",
  hasLateralRaiseMachine: "lateral-raise-machine",
  hasStandingLateralRaiseMachine: "standing-lateral-raise-machine",
  hasReverseFlyMachine: "reverse-fly-machine",
  hasShoulderPressMachine: "shoulder-press-machine",
  hasIsoLateralShoulderPressMachine: "iso-lateral-shoulder-press-machine",
  hasMultiPressMachine: "multi-press-machine",
  hasMultiHipMachine: "multi-hip-machine",
  hasHipAbductorMachine: "hip-abductor-machine",
  hasHipAdductorMachine: "hip-adductor-machine",
  hasLegExtensionMachine: "leg-extension-machine",
  hasLegPressMachine: "leg-press-machine",
  hasSeatedLegPressMachine: "seated-leg-press-machine",
  hasLyingLegCurlMachine: "lying-leg-curl-machine",
  hasSeatedLegCurlMachine: "seated-leg-curl-machine",
  hasSeatedCalfRaiseMachine: "seated-calf-raise-machine",
  hasSquatMachine: "squat-machine",
  hasHackSquat: "hack-squat",
  hasBeltSquatMachine: "belt-squat-machine",
  hasStandingCalfRaiseMachine: "standing-calf-raise-machine",
  hasGluteExtensionMachine: "glute-extension-machine",
  hasHipThrustMachine: "hip-thrust-machine",
  hasBoxingSandbag: "boxing-sandbag",
  hasBattleRope: "battle-rope",
  hasFoamRoller: "foam-roller",
  hasMedicineBall: "medicine-ball",
  hasExerciseStepper: "exercise-stepper",
  hasAbRoller: "ab-roller",
  hasMassageBall: "massage-ball",
  hasDipBelt: "dip-belt",
  hasWeightVest: "weight-vest",
  hasLiftingStraps: "lifting-straps",
  hasPlyoBox: "plyo-box",
  hasBalanceBall: "balance-ball",
  hasTrx: "trx",
  hasResistanceBand: "resistance-band",
  hasRings: "rings",
  hasYogaBlock: "yoga-block",
  hasYogaMat: "yoga-mat",
  hasStretchingMachine: "stretching-machine",
  hasMobilityStick: "mobility-stick",
  hasWashroom: "washroom",
  hasBathroom: "bathroom",
  hasChangingRoom: "changing-room",
  hasFreeWater: "free-water",
  hasDrySauna: "dry-sauna",
  hasWetSauna: "wet-sauna",
  hasIceBath: "ice-bath",
};

type SearchFiltersProps = {
  basePath?: string;
  fixedCollection?: string;
  fixedDistrict?: string;
};

export function SearchFilters({
  basePath = "/search",
  fixedCollection,
  fixedDistrict,
}: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("search");
  const tCommon = useTranslations("common");
  const tGym = useTranslations("gym");
  const tTraining = useTranslations("trainingPages");

  const [collection, setCollection] = useState(
    fixedCollection ?? searchParams.get("collection") ?? ""
  );
  const [district, setDistrict] = useState(
    fixedDistrict ?? searchParams.get("district") ?? ""
  );
  const currentView = searchParams.get("view");
  const [minRackCount, setMinRackCount] = useState(
    searchParams.get("minRackCount") ?? ""
  );
  const [minBenchCount, setMinBenchCount] = useState(
    searchParams.get("minBenchCount") ?? ""
  );
  const [minBarbellCount, setMinBarbellCount] = useState(
    searchParams.get("minBarbellCount") ?? ""
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
  const [minSize, setMinSize] = useState(searchParams.get("minSize") ?? "");
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
  const [selectedGymChains, setSelectedGymChains] = useState<string[]>(
    () =>
      (searchParams.get("gymChains") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
  );
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const activeFilterCount = useMemo(
    () =>
      Number(Boolean(district) && !fixedDistrict) +
      Number(Boolean(minRackCount)) +
      Number(Boolean(minBenchCount)) +
      Number(Boolean(minBarbellCount)) +
      Number(Boolean(minPlatformCount)) +
      Number(Boolean(minDumbbellWeight)) +
      Number(Boolean(minPlateWeight)) +
      Number(Boolean(minSize)) +
      Number(Boolean(collection) && !fixedCollection) +
      selectedFilters.size +
      selectedGymChains.length +
      selectedBrandSlugs.length,
    [
      collection,
      district,
      fixedCollection,
      fixedDistrict,
      minBarbellCount,
      minBenchCount,
      minDumbbellWeight,
      minPlateWeight,
      minSize,
      minPlatformCount,
      minRackCount,
      selectedGymChains.length,
      selectedBrandSlugs.length,
      selectedFilters,
    ]
  );

  const toggleFilter = useCallback((param: string, checked: boolean) => {
    const equipment = EQUIPMENT_FILTER_SLUGS[param];
    if (equipment) {
      trackEquipmentFilter({
        equipment,
        filter_param: param,
        selected: checked,
        source: "search_page",
      });
    }

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
    const isSelected = selectedBrandSlugs.includes(slug);
    if (checked === isSelected) return;

    trackEquipmentBrandFilter({
      equipment_brand: slug,
      filter_param: "brandSlugs",
      selected: checked,
      source: "search_page",
    });

    setSelectedBrandSlugs((current) =>
      checked ? [...current, slug] : current.filter((value) => value !== slug)
    );
  }, [selectedBrandSlugs]);

  const toggleGymChain = useCallback((slug: string, checked: boolean) => {
    const isSelected = selectedGymChains.includes(slug);
    if (checked === isSelected) return;

    trackGymBrandFilter({
      gym_chain: slug,
      filter_param: "gymChains",
      selected: checked,
      source: "search_page",
    });

    setSelectedGymChains((current) =>
      checked ? [...current, slug] : current.filter((value) => value !== slug)
    );
  }, [selectedGymChains]);

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
    const nextCollection = fixedCollection ?? collection;
    if (nextCollection && !fixedCollection) {
      params.set("collection", nextCollection);
    }
    const nextDistrict = fixedDistrict ?? district;
    if (nextDistrict && !fixedDistrict) params.set("district", nextDistrict);
    if (minRackCount) params.set("minRackCount", minRackCount);
    if (minBenchCount) params.set("minBenchCount", minBenchCount);
    if (minBarbellCount) params.set("minBarbellCount", minBarbellCount);
    if (minPlatformCount) {
      params.set("minPlatformCount", minPlatformCount);
    }
    if (minDumbbellWeight) {
      params.set("minDumbbellWeight", minDumbbellWeight);
    }
    if (minPlateWeight) params.set("minPlateWeight", minPlateWeight);
    if (minSize) params.set("minSize", minSize);
    if (selectedBrandSlugs.length > 0) {
      params.set("brandSlugs", selectedBrandSlugs.join(","));
    }
    if (selectedGymChains.length > 0) {
      params.set("gymChains", selectedGymChains.join(","));
    }
    selectedFilters.forEach((param) => params.set(param, "true"));
    return params.toString();
  }, [
    collection,
    currentView,
    district,
    fixedCollection,
    fixedDistrict,
    minBarbellCount,
    minBenchCount,
    minDumbbellWeight,
    minPlateWeight,
    minSize,
    minPlatformCount,
    minRackCount,
    searchParams,
    selectedBrandSlugs,
    selectedGymChains,
    selectedFilters,
  ]);

  const replaceWithoutScroll = useCallback(
    (href: string) => {
      router.replace(href, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete("page");
    currentParams.delete("pageSize");
    const currentFilterQuery = currentParams.toString();

    if (nextQueryString === currentFilterQuery) return;

    const timer = window.setTimeout(() => {
      replaceWithoutScroll(
        nextQueryString ? `${basePath}?${nextQueryString}` : basePath
      );
    }, FILTER_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [basePath, nextQueryString, replaceWithoutScroll, searchParams]);

  const applyFiltersNow = useCallback(() => {
    replaceWithoutScroll(
      nextQueryString ? `${basePath}?${nextQueryString}` : basePath
    );
  }, [basePath, nextQueryString, replaceWithoutScroll]);

  const trackNumericFilter = useCallback((param: string, value: string) => {
    if (!value) return;

    trackFilterApply({
      filter_param: param,
      filter_value: Number(value),
      selected: true,
      source: "search_page",
    });
  }, []);

  const clearFilters = useCallback(() => {
    [
      ["minRackCount", minRackCount],
      ["minBenchCount", minBenchCount],
      ["minBarbellCount", minBarbellCount],
      ["minPlatformCount", minPlatformCount],
      ["minDumbbellWeight", minDumbbellWeight],
      ["minPlateWeight", minPlateWeight],
      ["minSize", minSize],
    ].forEach(([param, value]) => {
      if (value) {
        trackFilterApply({
          filter_param: param,
          selected: false,
          source: "search_page",
        });
      }
    });

    selectedFilters.forEach((param) => {
      const equipment = EQUIPMENT_FILTER_SLUGS[param];
      if (!equipment) return;

      trackEquipmentFilter({
        equipment,
        filter_param: param,
        selected: false,
        source: "search_page",
      });
    });

    if (district && !fixedDistrict) {
      trackDistrictFilter({
        district,
        filter_param: "district",
        selected: false,
        source: "search_page",
      });
    }

    selectedBrandSlugs.forEach((slug) => {
      trackEquipmentBrandFilter({
        equipment_brand: slug,
        filter_param: "brandSlugs",
        selected: false,
        source: "search_page",
      });
    });

    selectedGymChains.forEach((slug) => {
      trackGymBrandFilter({
        gym_chain: slug,
        filter_param: "gymChains",
        selected: false,
        source: "search_page",
      });
    });

    setDistrict(fixedDistrict ?? "");
    setMinRackCount("");
    setMinBenchCount("");
    setMinBarbellCount("");
    setMinPlatformCount("");
    setMinDumbbellWeight("");
    setMinPlateWeight("");
    setMinSize("");
    setCollection(fixedCollection ?? "");
    setSelectedBrandSlugs([]);
    setSelectedGymChains([]);
    setSelectedFilters(new Set());
  }, [
    fixedCollection,
    district,
    fixedDistrict,
    minBarbellCount,
    minBenchCount,
    minDumbbellWeight,
    minPlateWeight,
    minSize,
    minPlatformCount,
    minRackCount,
    selectedBrandSlugs,
    selectedFilters,
    selectedGymChains,
  ]);

  const activeCollection = collection
    ? getTrainingPageDefinition(collection)
    : null;

  return (
    <aside className="w-full min-w-0 max-w-full shrink-0 md:w-72">
      <button
        type="button"
        onClick={() => setIsFilterPanelOpen((current) => !current)}
        aria-expanded={isFilterPanelOpen}
        className="mb-3 grid min-h-11 w-full max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 md:hidden"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-4 w-5 shrink-0 flex-col justify-between">
            <span className="h-0.5 rounded-full bg-gray-900" />
            <span className="h-0.5 rounded-full bg-gray-900" />
            <span className="h-0.5 rounded-full bg-gray-900" />
          </span>
          <span className="truncate">{t("filters")}</span>
        </span>
        {activeFilterCount > 0 && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {activeFilterCount}
          </span>
        )}
      </button>

      <div
        className={`w-full min-w-0 max-w-full space-y-5 rounded-lg border border-gray-200 bg-white p-5 ${
          isFilterPanelOpen ? "block" : "hidden md:block"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">{t("filters")}</h2>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {activeFilterCount}
            </span>
          )}
        </div>

        {activeCollection && !fixedCollection && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase text-gray-500">
              {t("collectionFilter")}
            </p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
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

        <FilterSection title={t("gymBrands")}>
          <p className="mb-2 text-xs text-gray-500">{t("gymBrandHint")}</p>
          <div className="grid gap-2">
            {GYM_CHAINS.map((chain) => {
              const label =
                locale === "zh-HK" && chain.name_zh
                  ? chain.name_zh
                  : chain.name_en;
              return (
                <CheckboxFilter
                  key={chain.slug}
                  label={label}
                  checked={selectedGymChains.includes(chain.slug)}
                  onChange={(checked) => toggleGymChain(chain.slug, checked)}
                />
              );
            })}
          </div>
        </FilterSection>

        <FilterSection title={tGym("freeWeight")}>
          <NumberFilter
            label={t("minRacks")}
            value={minRackCount}
            placeholder="e.g. 4"
            onChange={setMinRackCount}
            onCommit={(value) => trackNumericFilter("minRackCount", value)}
          />
          <NumberFilter
            label={t("minBenches")}
            value={minBenchCount}
            placeholder="e.g. 6"
            onChange={setMinBenchCount}
            onCommit={(value) => trackNumericFilter("minBenchCount", value)}
          />
          <NumberFilter
            label={t("minBarbells")}
            value={minBarbellCount}
            placeholder="e.g. 8"
            onChange={setMinBarbellCount}
            onCommit={(value) => trackNumericFilter("minBarbellCount", value)}
          />
          <NumberFilter
            label={t("minPlatforms")}
            value={minPlatformCount}
            placeholder="e.g. 2"
            onChange={setMinPlatformCount}
            onCommit={(value) => trackNumericFilter("minPlatformCount", value)}
          />
          <NumberFilter
            label={t("maxDumbbell")}
            value={minDumbbellWeight}
            placeholder="e.g. 40"
            step="0.1"
            onChange={setMinDumbbellWeight}
            onCommit={(value) => trackNumericFilter("minDumbbellWeight", value)}
          />
          <NumberFilter
            label={t("smallestPlate")}
            value={minPlateWeight}
            placeholder="e.g. 1.25"
            step="0.25"
            onChange={setMinPlateWeight}
            onCommit={(value) => trackNumericFilter("minPlateWeight", value)}
          />
          <NumberFilter
            label={t("minSize")}
            value={minSize}
            placeholder="e.g. 5000"
            onChange={setMinSize}
            onCommit={(value) => trackNumericFilter("minSize", value)}
          />
          <div className="mt-3 border-t border-gray-100 pt-3">
            {FREE_WEIGHT_FILTERS.map((filter) => (
              <CheckboxFilter
                key={filter.param}
                label={tGym(filter.labelKey)}
                checked={selectedFilters.has(filter.param)}
                onChange={(checked) => toggleFilter(filter.param, checked)}
              />
            ))}
          </div>
        </FilterSection>

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
            className="w-full min-w-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            {tCommon("search")}
          </button>
          <button
            onClick={clearFilters}
            className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
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
  onCommit,
}: {
  label: string;
  value: string;
  placeholder: string;
  step?: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
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
        onBlur={(e) => onCommit?.(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
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
      className="group min-w-0 rounded-lg border border-gray-200 px-3 py-2"
    >
      <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-gray-900">
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{title}</span>
        <span className="shrink-0 text-gray-400 transition-transform group-open:rotate-180">
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
    <label className="flex min-w-0 cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 shrink-0 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
      />
      <span className="min-w-0 break-words text-sm leading-5 text-gray-700 [overflow-wrap:anywhere]">
        {label}
      </span>
    </label>
  );
}
