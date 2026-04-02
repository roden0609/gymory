import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Gyms",
  description: "Search nearby gyms by equipment, location, and size.",
};

// Search params: district, minDumbbellWeight, minRackCount, hasAssaultBike, etc.
export default function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Search Results</h1>
      {/* TODO: SearchFilters sidebar + GymList/MapToggle */}
    </main>
  );
}
