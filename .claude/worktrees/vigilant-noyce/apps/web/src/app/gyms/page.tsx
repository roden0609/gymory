import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gyms",
  description: "Browse all gyms in our database.",
};

// TODO: fetch gyms from Supabase, render list
export default function GymsPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">All Gyms</h1>
      {/* TODO: GymList component */}
    </main>
  );
}
