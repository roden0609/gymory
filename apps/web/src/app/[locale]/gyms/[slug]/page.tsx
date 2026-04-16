import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // TODO: fetch gym by slug, return title/description
  return {
    title: params.slug,
  };
}

// TODO: fetch gym detail from Supabase by slug
export default async function GymDetailPage({ params }: Props) {
  const { slug } = params;

  // TODO: const gym = await getGymBySlug(slug);
  // if (!gym) notFound();

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">{slug}</h1>
      {/* TODO: GymDetailCard, EquipmentSummary, MapEmbed, SuggestUpdateButton */}
    </main>
  );
}
