import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add a Gym",
  description: "Submit a gym to the Gymory database.",
};

// No login required for MVP submission
export default function SubmitPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Add a Gym</h1>
      <p className="mt-2 text-gray-500">
        Know a gym that's not listed? Add it here.
      </p>
      {/* TODO: SubmitGymForm */}
    </main>
  );
}
