"use client";

import { useSearchNavigation } from "./SearchNavigation";

import { useCallback, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { trackDistrictFilter } from "@/lib/analytics";
import { DISTRICT_PAGE_DEFINITIONS, getDistrictPageLabel } from "@/lib/district-pages";
import { getSearchBrowseHref, getSelectedDistricts } from "@/lib/search-navigation";
import { MultiSelectFilter } from "./MultiSelectFilter";

type DistrictBrowseControlsProps = {
  currentDistrictCode?: string;
  trainingSlug?: string;
  currentGymChainSlug?: string;
};

export function DistrictBrowseControls({
  currentDistrictCode,
  trainingSlug,
  currentGymChainSlug,
}: DistrictBrowseControlsProps) {
  const locale = useLocale() as "en" | "zh-HK";
  const navigation = useSearchNavigation();
  const { searchParams, navigate } = navigation;
  if (navigation.target) {
    currentDistrictCode = navigation.target.district;
    currentGymChainSlug = navigation.target.gymChain;
    trainingSlug = navigation.target.collection;
  }
  const t = useTranslations("search");
  const params = new URLSearchParams(searchParams.toString());
  const selected = getSelectedDistricts(params, currentDistrictCode).map((item) => item.slug);
  const gymChains = useMemo(
    () => currentGymChainSlug ? [currentGymChainSlug] : (searchParams.get("gymChains") ?? "").split(",").filter(Boolean),
    [currentGymChainSlug, searchParams]
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const hasUserLocation =
    Boolean(searchParams.get("userLat")) && Boolean(searchParams.get("userLng"));

  const goToDistricts = (next: string[]) => {
    for (const district of DISTRICT_PAGE_DEFINITIONS) {
      if (selected.includes(district.slug) === next.includes(district.slug)) continue;
      trackDistrictFilter({ district: district.slug, filter_param: "districts", selected: next.includes(district.slug), source: "search_page" });
    }
    navigate(getSearchBrowseHref({ params, districtSlugs: next, gymChainSlugs: gymChains, trainingSlug }), { scroll: false });
  };

  const locationContextKey = `${currentDistrictCode ?? ""}|${currentGymChainSlug ?? ""}|${trainingSlug ?? ""}|${searchParams}`;
  const latestLocationContext = useRef(locationContextKey);
  latestLocationContext.current = locationContextKey;

  const requestUserLocation = useCallback(() => {
    const requestedContext = latestLocationContext.current;
    if (!navigator.geolocation) {
      setLocationError(t("locationUnsupported"));
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        // A newer filter choice takes precedence over an earlier location request.
        if (latestLocationContext.current !== requestedContext) return;
        const params = new URLSearchParams(searchParams.toString());
        params.delete("district");
        params.delete("districts");
        if (currentGymChainSlug) params.set("gymChains", currentGymChainSlug);
        if (trainingSlug) params.set("collection", trainingSlug);
        params.delete("page");
        params.delete("pageSize");
        params.set("userLat", position.coords.latitude.toFixed(6));
        params.set("userLng", position.coords.longitude.toFixed(6));
        navigate(`/search?${params.toString()}`);
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
  }, [currentGymChainSlug, navigate, searchParams, t, trainingSlug]);

  const clearLocation = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("userLat");
    params.delete("userLng");
    params.delete("page");
    params.delete("pageSize");
    setLocationError(null);
    navigate(getSearchBrowseHref({ params, districtSlugs: selected, gymChainSlugs: gymChains, trainingSlug }), { scroll: false });
  }, [gymChains, navigate, searchParams, selected, trainingSlug]);

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="flex w-full min-w-0 max-w-full flex-col gap-2 xl:flex-row xl:flex-wrap">
        <button
          type="button"
          onClick={requestUserLocation}
          disabled={isLocating}
          className={`inline-flex min-h-9 w-full min-w-0 max-w-full items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto xl:shrink-0 ${
            hasUserLocation
              ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-700"
              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          {isLocating ? t("locating") : t("useMyLocation")}
        </button>
        {hasUserLocation ? (
          <button
            type="button"
            onClick={clearLocation}
            className="inline-flex min-h-9 w-full min-w-0 max-w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 xl:w-auto xl:shrink-0"
          >
            {t("clearLocation")}
          </button>
        ) : null}
        <div className="w-full min-w-0 max-w-full xl:flex-1">
          <MultiSelectFilter filterKey="districts" label={t("district")} placeholder={t("anyDistrict")} widePanel
            options={DISTRICT_PAGE_DEFINITIONS.map((item) => ({ value: item.slug, label: getDistrictPageLabel(item, locale) }))}
            selected={selected} onChange={goToDistricts} />
        </div>
      </div>
      {locationError ? (
        <p className="mt-2 text-xs text-red-600">{locationError}</p>
      ) : null}
    </div>
  );
}
