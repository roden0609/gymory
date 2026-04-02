import { createClient } from "../supabase-server";
import type { Gym } from "@gymory/shared";

export async function getGymBySlug(slug: string): Promise<Gym | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) return null;
  return data as Gym;
}

export async function getGymById(id: string): Promise<Gym | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Gym;
}
