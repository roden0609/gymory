"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { HK_DISTRICTS } from "@gymory/shared";

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [district, setDistrict] = useState(searchParams.get("district") ?? "");
  const [minRackCount, setMinRackCount] = useState(searchParams.get("minRackCount") ?? "");
  const [minDumbbellWeight, setMinDumbbellWeight] = useState(searchParams.get("minDumbbellWeight") ?? "");
  const [hasAssaultBike, setHasAssaultBike] = useState(searchParams.get("hasAssaultBike") === "true");
  const [hasSkiErg, setHasSkiErg] = useState(searchParams.get("hasSkiErg") === "true");
  const [hasRower, setHasRower] = useState(searchParams.get("hasRower") === "true");

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (district) params.set("district", district);
    if (minRackCount) params.set("minRackCount", minRackCount);
    if (minDumbbellWeight) params.set("minDumbbellWeight", minDumbbellWeight);
    if (hasAssaultBike) params.set("hasAssaultBike", "true");
    if (hasSkiErg) params.set("hasSkiErg", "true");
    if (hasRower) params.set("hasRower", "true");
    router.push(`/search?${params.toString()}`);
  }, [district, minRackCount, minDumbbellWeight, hasAssaultBike, hasSkiErg, hasRower, router]);

  const clearFilters = useCallback(() => {
    setDistrict("");
    setMinRackCount("");
    setMinDumbbellWeight("");
    setHasAssaultBike(false);
    setHasSkiErg(false);
    setHasRower(false);
    router.push("/search");
  }, [router]);

  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <h2 className="font-semibold text-gray-900">Filters</h2>

        {/* District */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">District</label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Any district</option>
            {HK_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Min rack count */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Min racks</label>
          <input
            type="number"
            min={0}
            value={minRackCount}
            onChange={(e) => setMinRackCount(e.target.value)}
            placeholder="e.g. 4"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {/* Min dumbbell weight */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Max dumbbell ≥ (kg)</label>
          <input
            type="number"
            min={0}
            value={minDumbbellWeight}
            onChange={(e) => setMinDumbbellWeight(e.target.value)}
            placeholder="e.g. 40"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {/* Equipment checkboxes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Equipment</label>
          <div className="space-y-2">
            {[
              { label: "Assault bike", value: hasAssaultBike, set: setHasAssaultBike },
              { label: "Ski erg", value: hasSkiErg, set: setHasSkiErg },
              { label: "Rower", value: hasRower, set: setHasRower },
            ].map(({ label, value, set }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => set(e.target.checked)}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={applyFilters}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            Search
          </button>
          <button
            onClick={clearFilters}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </aside>
  );
}
