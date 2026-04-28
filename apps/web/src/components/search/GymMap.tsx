"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { GymSummary } from "@gymory/shared";
import { getHkDistrictLabel } from "@gymory/shared";
import type { Icon } from "leaflet";
import L from "leaflet";

const DynamicMapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);

const DynamicTileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const DynamicMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const DynamicPopup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

const DEFAULT_CENTER: [number, number] = [22.3193, 114.1694];
const DEFAULT_ZOOM = 11;

const markerIcon: Icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function formatCountBadge(
  count: number | null,
  singular: string,
  plural = `${singular}s`
) {
  if (count === null || count <= 0) return null;
  return `${count} ${count === 1 ? singular : plural}`;
}

function getGoogleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function MapSkeleton() {
  return (
    <div className="h-[62vh] min-h-[420px] w-full animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
  );
}

export function GymMap({
  gyms,
  onFallbackToList,
}: {
  gyms: GymSummary[];
  onFallbackToList: () => void;
}) {
  const tSearch = useTranslations("search");
  const tGym = useTranslations("gym");
  const locale = useLocale() as "en" | "zh-HK";
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasMapError, setHasMapError] = useState(false);

  const gymsWithCoords = useMemo(
    () =>
      gyms.filter(
        (gym) => typeof gym.lat === "number" && typeof gym.lng === "number"
      ),
    [gyms]
  );
  const gymsWithoutCoordsCount = gyms.length - gymsWithCoords.length;

  const mapCenter = useMemo<[number, number]>(() => {
    if (gymsWithCoords.length === 0) return DEFAULT_CENTER;
    const sum = gymsWithCoords.reduce(
      (acc, gym) => {
        acc.lat += gym.lat as number;
        acc.lng += gym.lng as number;
        return acc;
      },
      { lat: 0, lng: 0 }
    );
    return [sum.lat / gymsWithCoords.length, sum.lng / gymsWithCoords.length];
  }, [gymsWithCoords]);

  if (gyms.length === 0) {
    return (
      <div className="flex h-[62vh] min-h-[420px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500">
        {tSearch("noResults")}
      </div>
    );
  }

  if (gymsWithCoords.length === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-medium text-gray-900">{tSearch("mapNoCoordinates")}</p>
        <p className="text-sm text-gray-500">
          {tSearch("mapNoCoordinatesSub", { count: gymsWithoutCoordsCount })}
        </p>
      </div>
    );
  }

  if (hasMapError) {
    return (
      <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-medium text-red-800">{tSearch("mapLoadFailed")}</p>
        <button
          type="button"
          onClick={onFallbackToList}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          {tSearch("backToList")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {gymsWithoutCoordsCount > 0 ? (
        <p className="text-sm text-gray-500">
          {tSearch("mapMissingCoordinates", { count: gymsWithoutCoordsCount })}
        </p>
      ) : null}

      <div className="relative">
        {!isMapReady ? (
          <div className="absolute inset-0 z-10">
            <MapSkeleton />
          </div>
        ) : null}

        <DynamicMapContainer
          center={mapCenter}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-[62vh] min-h-[420px] w-full rounded-xl border border-gray-200"
          whenReady={() => setIsMapReady(true)}
        >
          <DynamicTileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileerror: () => setHasMapError(true),
            }}
          />

          {gymsWithCoords.map((gym) => {
            const displayName =
              locale === "zh-HK" && gym.name_zh ? gym.name_zh : gym.name;
            const districtLabel = getHkDistrictLabel(gym.district_code, locale);
            const equipment: string[] = [];
            const rack = formatCountBadge(gym.rack_count, "rack");
            if (rack) equipment.push(rack);
            if (gym.dumbbell_max_weight_kg) {
              equipment.push(`DB ${gym.dumbbell_max_weight_kg}kg`);
            }
            const rower = formatCountBadge(gym.rower_count, "rower");
            if (rower) equipment.push(rower);

            const lat = gym.lat as number;
            const lng = gym.lng as number;

            return (
              <DynamicMarker key={gym.id} position={[lat, lng]} icon={markerIcon}>
                <DynamicPopup>
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-gray-900">{displayName}</p>
                    <p className="text-gray-600">{districtLabel}</p>
                    {equipment.length > 0 ? (
                      <p className="text-gray-600">{equipment.join(" · ")}</p>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/${locale}/gyms/${gym.slug}`}
                        className="font-medium text-gray-900 underline"
                      >
                        View
                      </Link>
                      <a
                        href={getGoogleMapsUrl(lat, lng)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-gray-700 underline"
                      >
                        {tGym("openMap")}
                      </a>
                    </div>
                  </div>
                </DynamicPopup>
              </DynamicMarker>
            );
          })}
        </DynamicMapContainer>
      </div>
    </div>
  );
}
