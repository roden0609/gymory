"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { HK_DISTRICTS, getHkDistrictLabel } from "@gymory/shared";
import { useRouter } from "@/i18n/navigation";
import { getDistrictPageDefinitionByCode } from "@/lib/district-pages";

type DistrictBrowseControlsProps = {
  currentDistrictCode?: string;
  trainingSlug?: string;
};

export function DistrictBrowseControls({
  currentDistrictCode,
  trainingSlug,
}: DistrictBrowseControlsProps) {
  const locale = useLocale() as "en" | "zh-HK";
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("search");
  const [district, setDistrict] = useState(currentDistrictCode ?? "");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const hasUserLocation =
    Boolean(searchParams.get("userLat")) && Boolean(searchParams.get("userLng"));

  useEffect(() => {
    setDistrict(currentDistrictCode ?? "");
  }, [currentDistrictCode]);

  const goToDistrict = useCallback(
    (nextDistrict: string) => {
      setDistrict(nextDistrict);

      if (!nextDistrict) {
        router.push(trainingSlug ? `/${trainingSlug}` : "/search");
        return;
      }

      const districtPage = getDistrictPageDefinitionByCode(nextDistrict);
      if (trainingSlug && districtPage) {
        router.push(`/${trainingSlug}/districts/${districtPage.slug}`);
        return;
      }

      router.push(districtPage ? `/districts/${districtPage.slug}` : "/search");
    },
    [router, trainingSlug]
  );

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
        const params = new URLSearchParams(searchParams.toString());
        params.delete("district");
        params.delete("page");
        params.delete("pageSize");
        params.set("userLat", position.coords.latitude.toFixed(6));
        params.set("userLng", position.coords.longitude.toFixed(6));
        router.push(`/search?${params.toString()}`);
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
  }, [router, searchParams, t]);

  const clearLocation = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("userLat");
    params.delete("userLng");
    params.delete("page");
    params.delete("pageSize");
    setLocationError(null);
    router.push(params.toString() ? `/search?${params.toString()}` : "/search");
  }, [router, searchParams]);

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={requestUserLocation}
          disabled={isLocating}
          className={`inline-flex min-h-9 w-full min-w-0 max-w-full items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
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
            className="inline-flex min-h-9 w-full min-w-0 max-w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 sm:w-auto"
          >
            {t("clearLocation")}
          </button>
        ) : null}
        <select
          value={district}
          onChange={(event) => goToDistrict(event.target.value)}
          className="h-9 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 sm:max-w-80"
        >
          <option value="">{t("anyDistrict")}</option>
          {HK_DISTRICTS.map((item) => (
            <option key={item.code} value={item.code}>
              {getHkDistrictLabel(item.code, locale)}
            </option>
          ))}
        </select>
      </div>
      {locationError ? (
        <p className="mt-2 text-xs text-red-600">{locationError}</p>
      ) : null}
    </div>
  );
}
