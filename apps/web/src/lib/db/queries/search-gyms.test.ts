import { beforeEach, describe, expect, it, vi } from "vitest";

const { query, createClient } = vi.hoisted(() => {
  const query = {
    select: vi.fn(), eq: vi.fn(), in: vi.fn(), or: vi.fn(), gte: vi.fn(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], count: 0, error: null }).then(resolve),
  };
  return { query, createClient: vi.fn(async () => ({ from: () => query })) };
});
vi.mock("../supabase-server", () => ({ createClient }));
vi.mock("./equipment-catalog-search", () => ({ getCatalogSearchGymIds: vi.fn(async () => null) }));
import { searchGyms } from "./search-gyms";

beforeEach(() => {
  vi.clearAllMocks();
  for (const method of [query.select, query.eq, query.in, query.or, query.gte]) method.mockReturnValue(query);
});

describe("multi-district gym search", () => {
  it("queries an OR set of district codes while retaining brand and equipment conditions", async () => {
    await searchGyms({ districts: "wan-chai,yau-tsim-mong", gymChains: "anytime-fitness", minRackCount: "2" });
    expect(query.in).toHaveBeenCalledWith("district_code", ["HK-WC", "HK-YTM"]);
    expect(query.or).toHaveBeenCalledWith("slug.like.anytime-fitness-*");
    expect(query.gte).toHaveBeenCalledWith("rack_count", 2);
    expect(query.eq).not.toHaveBeenCalledWith("district_code", expect.anything());
  });

  it("keeps fixed district pages and legacy district queries scoped to their own district", async () => {
    await searchGyms({ district: "HK-YTM", districts: "wan-chai" });
    expect(query.eq).toHaveBeenCalledWith("district_code", "HK-YTM");
    expect(query.in).not.toHaveBeenCalledWith("district_code", expect.anything());
  });

  it("does not widen an entirely unknown district selection to all gyms", async () => {
    const result = await searchGyms({ districts: "unknown" });
    expect(result.totalCount).toBe(0);
    expect(result.gyms).toEqual([]);
  });
});
