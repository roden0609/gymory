import "server-only";
import { createServerClient } from "@supabase/ssr";

/** Anonymous-only reads for shared caches: never inherit request cookies or admin credentials. */
export function createPublicClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: { getAll: () => [], setAll() {} },
      auth: { autoRefreshToken: false, persistSession: false },
      // Cache only the explicit projection via unstable_cache, not raw HTTP responses.
      global: { fetch: (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => fetch(input, { ...init, cache: "no-store" }) },
    }
  );
}
