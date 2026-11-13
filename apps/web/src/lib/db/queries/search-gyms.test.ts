import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Next.js supplies React cache in its Server Component runtime.
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));

const { query, createClient } = vi.hoisted(() => {
  const query = {
    execute: vi.fn(), select: vi.fn(), eq: vi.fn(), in: vi.fn(), or: vi.fn(), gte: vi.fn(),
    then: (resolve: (value: unknown) => unknown) => query.execute().then(resolve),
  };
  return { query, createClient: vi.fn(async () => ({ from: () => query })) };
});
vi.mock("../supabase-server", () => ({ createClient }));
vi.mock("./equipment-catalog-search", () => ({ getCatalogSearchGymIds: vi.fn(async () => null) }));
import { getCatalogSearchGymIds } from "./equipment-catalog-search";
import { searchGyms } from "./search-gyms";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.mocked(getCatalogSearchGymIds).mockResolvedValue(null);
  query.execute.mockResolvedValue({ data: [], count: 0, error: null });
  for (const method of [query.select, query.eq, query.in, query.or, query.gte]) method.mockReturnValue(query);
});

afterEach(() => vi.restoreAllMocks());

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

it("does not present a database timeout as a successful empty search", async () => {
  query.execute.mockResolvedValue({ data: null, count: null, error: { code: "57014", message: "canceling statement due to statement timeout" } });
  await expect(searchGyms({})).rejects.toThrow("Failed to load gyms (57014)");
  expect(JSON.parse(vi.mocked(console.info).mock.calls[0][0])).toMatchObject({
    event: "gym_search_timing", status: "error", gym_query_ms: expect.any(Number),
  });
});

it("batches large category matches while retaining filters, totals, and global pagination", async () => {
  const ids = Array.from({ length: 144 }, (_, i) => `gym-${i}`);
  vi.mocked(getCatalogSearchGymIds).mockResolvedValue(new Set(ids));
  const rows = ids.map((id, i) => ({ id, slug: id, updated_at: new Date(2026, 0, i + 1).toISOString(), data_accuracy_status: "normal" }));
  query.execute.mockResolvedValueOnce({ data: rows.slice(0, 50), count: 50, error: null })
    .mockResolvedValueOnce({ data: rows.slice(50, 100), count: 50, error: null })
    .mockResolvedValueOnce({ data: rows.slice(100), count: 44, error: null });
  const result = await searchGyms({ category: "free-weight", district: "HK-YTM", minRackCount: "2", page: "2" });
  expect(query.in.mock.calls.filter(([column]) => column === "id")).toEqual([
    ["id", ids.slice(0, 50)], ["id", ids.slice(50, 100)], ["id", ids.slice(100)],
  ]);
  expect(query.eq.mock.calls.filter(([column]) => column === "district_code")).toHaveLength(3);
  expect(query.gte.mock.calls.filter(([column]) => column === "rack_count")).toHaveLength(3);
  expect(result.totalCount).toBe(144);
  expect(JSON.parse(vi.mocked(console.info).mock.calls[0][0])).toMatchObject({
    event: "gym_search_timing", status: "ok", gym_query_batches: 3,
    matched_gyms: 144, returned_gyms: 20, gym_query_ms: expect.any(Number),
    votes_query_ms: expect.any(Number), sort_paginate_ms: expect.any(Number),
  });
  expect(result.gyms.map(({ id }) => id)).toEqual(ids.slice(104, 124).reverse());
});

it("rejects a failed category batch rather than returning partial results", async () => {
  vi.mocked(getCatalogSearchGymIds).mockResolvedValue(new Set(Array.from({ length: 51 }, (_, i) => `gym-${i}`)));
  query.execute.mockResolvedValueOnce({ data: [], count: 0, error: null })
    .mockResolvedValueOnce({ data: null, count: null, error: { code: "57014" } });
  await expect(searchGyms({ category: "free-weight" })).rejects.toThrow("Failed to load gyms (57014)");
});
