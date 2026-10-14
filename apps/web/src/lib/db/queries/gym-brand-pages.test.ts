import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({
  query: { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), or: vi.fn() },
}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("../supabase-server", () => ({ createClient: async () => ({ from: () => query }) }));
import { getActiveGymDirectoryEntries, getGymBrandDirectory, getGymBrandOverview } from "./gym-brand-pages";

beforeEach(() => {
  vi.clearAllMocks();
  for (const method of [query.select, query.eq, query.order]) method.mockReturnValue(query);
});

describe("gym brand directory queries", () => {
  it("includes brands beyond the database response limit in directory counts", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({ slug: `anytime-fitness-${i}`, district_code: "HK-WC", updated_at: "2026-10-14" }));
    query.range.mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: [{ slug: "snap-fitness-last", district_code: "HK-YTM", updated_at: "2026-10-14" }], error: null });
    const directory = await getGymBrandDirectory();
    expect(directory.find((brand) => brand.slug === "anytime-fitness")?.count).toBe(1000);
    expect(directory.find((brand) => brand.slug === "snap-fitness")?.count).toBe(1);
    expect(query.range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
  });

  it("does not publish partial counts when a later database page fails", async () => {
    query.range.mockResolvedValueOnce({ data: new Array(1000).fill({ slug: "anytime-fitness-a" }), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    await expect(getActiveGymDirectoryEntries()).rejects.toThrow("offline");
  });

  it("summarizes only active gym records matching the requested brand", async () => {
    query.or.mockResolvedValue({ data: [{ district_code: "HK-WC", rack_count: 2, has_free_water: true }], error: null });
    const summary = await getGymBrandOverview("anytime-fitness");
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(query.or).toHaveBeenCalledWith("slug.like.anytime-fitness-*");
    expect(summary?.features).toEqual([{ key: "racks", count: 1 }, { key: "drinkingWater", count: 1 }]);
    expect(await getGymBrandOverview("unknown-brand")).toBeNull();
  });
});
