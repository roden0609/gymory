import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createPublicClient } from "./supabase-public";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("uses only the publishable credential and disables raw HTTP caching", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://public-cache-test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "public-test-key");
  vi.stubEnv("SUPABASE_SECRET_KEY", "private-service-test-key");
  const request = vi.fn(async (_input: unknown, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    expect(headers.get("apikey")).toBe("public-test-key");
    expect(headers.get("authorization")).toBe("Bearer public-test-key");
    expect(headers.get("cookie")).toBeNull();
    expect(JSON.stringify(init)).not.toContain("private-service-test-key");
    expect(init?.cache).toBe("no-store");
    return new Response("[]", { headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", request);
  const { error } = await createPublicClient().from("equipment").select("id, name");
  expect(error).toBeNull();
  expect(request).toHaveBeenCalledTimes(1);
});
