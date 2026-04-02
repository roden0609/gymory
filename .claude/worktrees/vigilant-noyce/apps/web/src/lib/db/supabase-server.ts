import { createClient as _createClient } from "@supabase/supabase-js";

// Server-side Supabase client (uses service role key for admin ops,
// or anon key for public read — swap as needed per route)
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return _createClient(url, key);
}
