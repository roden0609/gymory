import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Next.js supplies React cache in its Server Component runtime.
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));

const { query, rpc, createClient } = vi.hoisted(() => {
  const query = {
    execute: vi.fn(), select: vi.fn(), eq: vi.fn(), in: vi.fn(), or: vi.fn(), gte: vi.fn(), order: vi.fn(), range: vi.fn(), limit: vi.fn(),
    then: (resolve: (value: unknown) => unknown) => query.execute().then(resolve),
  };
  const rpc = vi.fn(() => query);
  return { query, rpc, createClient: vi.fn(async () => ({ rpc })) };
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
  for (const method of [query.select, query.eq, query.in, query.or, query.gte, query.order, query.range, query.limit]) method.mockReturnValue(query);
});

afterEach(() => vi.restoreAllMocks());

it("filters both public names literally before pagination and retains other filters", async () => {
  await searchGyms({ gymName: "  健身, (EFX24)*  ", district: "HK-YTM", page: "2" });
  const operand = String.raw`"健身, \\(EFX24\\)\\*"`;
  expect(query.or).toHaveBeenCalledWith(`name.imatch.${operand},name_zh.imatch.${operand}`);
  expect(query.eq).toHaveBeenCalledWith("district_code", "HK-YTM");
  expect(query.range).toHaveBeenCalled();
  expect(query.or.mock.invocationCallOrder[0]).toBeLessThan(query.range.mock.invocationCallOrder[0]);
});

describe("multi-district gym search", () => {
  it("queries an OR set of district codes while retaining brand and equipment conditions", async () => {
    await searchGyms({ districts: "wan-chai,yau-tsim-mong", gymChains: "anytime-fitness", minRackCount: "2" });
    expect(query.in).toHaveBeenCalledWith("district_code", ["HK-WC", "HK-YTM"]);
    expect(query.eq).toHaveBeenCalledWith("gym_chain_code", "anytime");
    expect(query.or).not.toHaveBeenCalled();
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

it("sends all category IDs in one RPC body and paginates after database filtering", async () => {
  const ids = Array.from({ length: 144 }, (_, i) => `gym-${i}`);
  vi.mocked(getCatalogSearchGymIds).mockResolvedValue(new Set(ids));
  const rows = [{ id: "page-2", slug: "page-2" }];
  query.execute.mockResolvedValue({ data: rows, count: 144, error: null });
  const result = await searchGyms({ category: "free-weight", district: "HK-YTM", minRackCount: "2", page: "2" });
  expect(rpc).toHaveBeenCalledExactlyOnceWith("search_gyms", { p_gym_ids: ids, p_user_lat: null, p_user_lng: null }, { count: "exact" });
  expect(query.in).not.toHaveBeenCalledWith("id", expect.anything());
  expect(query.eq).toHaveBeenCalledWith("district_code", "HK-YTM");
  expect(query.gte).toHaveBeenCalledWith("rack_count", 2);
  expect(query.order).toHaveBeenCalledWith("search_order", { ascending: true });
  expect(query.range).toHaveBeenCalledWith(20, 39);
  expect(result).toMatchObject({ gyms: rows, totalCount: 144, page: 2, totalPages: 8, hasNextPage: true });
  expect(JSON.parse(vi.mocked(console.info).mock.calls[0][0])).toMatchObject({
    gym_query_batches: 1, matched_gyms: 144, returned_gyms: 1,
  });
});

it("passes location to SQL and does not sort or slice a returned page again", async () => {
  const rows = [{ id: "closer", slug: "z", search_order: 1 }, { id: "further", slug: "a", search_order: 2 }];
  query.execute.mockResolvedValue({ data: rows, count: 42, error: null });
  const result = await searchGyms({ userLat: "22.3", userLng: "114.1", page: "3" });
  expect(rpc).toHaveBeenCalledWith("search_gyms", { p_gym_ids: null, p_user_lat: 22.3, p_user_lng: 114.1 }, { count: "exact" });
  expect(result.gyms.map(({ id }) => id)).toEqual(["closer", "further"]);
  expect(result.gyms.every((gym) => !("search_order" in gym))).toBe(true);
  expect(result).toMatchObject({ totalCount: 42, totalPages: 3, hasNextPage: false });
});

it("retains total count for an empty out-of-range page", async () => {
  query.execute.mockResolvedValue({ data: [], count: 42, error: null });
  expect(await searchGyms({ page: "4" })).toMatchObject({ gyms: [], totalCount: 42, totalPages: 3, hasNextPage: false });
});

it("filters collections before database pagination and preserves the exact filtered count", async () => {
  query.execute.mockResolvedValue({ data: [{ id: "yes", slug: "yes", search_order: 21 }], count: 21, error: null });
  const result = await searchGyms({ collection: "hyrox-official-hong-kong", district: "HK-YTM", page: "2" });
  expect(rpc).toHaveBeenCalledExactlyOnceWith("search_gyms", {
    p_gym_ids: null, p_user_lat: null, p_user_lng: null, p_collection: "hyrox-official-hong-kong",
  }, { count: "exact" });
  expect(query.eq).toHaveBeenCalledWith("district_code", "HK-YTM");
  expect(query.range).toHaveBeenCalledWith(20, 39);
  expect(query.order).toHaveBeenCalledWith("search_order", { ascending: true });
  expect(result).toMatchObject({ gyms: [{ id: "yes" }], totalCount: 21, totalPages: 2, hasNextPage: false });
});

it("selects aggregated votes and preserves the database page order", async () => {
  query.execute.mockResolvedValue({ data: [
    { id: "newer", slug: "newer", updated_at: "2026-11-13", data_accuracy_status: "normal", accuracy_like_count: 0, accuracy_dislike_count: 0, accuracy_total_votes: 0 },
    { id: "liked", slug: "liked", updated_at: "2026-01-01", data_accuracy_status: "normal", accuracy_like_count: 3, accuracy_dislike_count: 1, accuracy_total_votes: 4 },
  ], count: 2, error: null });
  const result = await searchGyms({});
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(query.select).toHaveBeenCalledWith(expect.stringContaining("accuracy_like_count, accuracy_dislike_count, accuracy_total_votes"));
  expect(result.gyms.map(({ id }) => id)).toEqual(["newer", "liked"]);
  expect(result.gyms[1].accuracy_total_votes).toBe(4);
});

it("uses equality for 24/7 Fitness and IN for multiple recognized gym chains", async () => {
  await searchGyms({ gymChains: "24-7-fitness" });
  expect(query.eq).toHaveBeenCalledWith("gym_chain_code", "247");
  await searchGyms({ gymChains: "24-7-fitness,anytime-fitness,unknown" });
  expect(query.in).toHaveBeenCalledWith("gym_chain_code", ["247", "anytime"]);
  expect(query.or).not.toHaveBeenCalled();
});

it("does not query gyms for an entirely unknown chain", async () => {
  expect((await searchGyms({ gymChains: "unknown" })).totalCount).toBe(0);
  expect(rpc).not.toHaveBeenCalled();
});

it("recovers exact totals after PostgREST rejects an out-of-range offset", async () => {
  query.execute.mockResolvedValueOnce({ data: null, count: null, error: { code: "PGRST103" } })
    .mockResolvedValueOnce({ data: [], count: 42, error: null });
  expect(await searchGyms({ page: "4", district: "HK-YTM" })).toMatchObject({ gyms: [], totalCount: 42, totalPages: 3, hasNextPage: false });
  expect(query.limit).toHaveBeenCalledWith(0);
  expect(query.select).toHaveBeenLastCalledWith("id");
  expect(query.eq.mock.calls.filter(([column]) => column === "district_code")).toHaveLength(2);
});

it("returns only the approved summary columns, excluding RPC rank and unexpected private fields", async () => {
  query.execute.mockResolvedValue({ data: [{
    id: "public", slug: "public", search_order: 1,
    source_url: "private-source", captured_name: "private-name", source: "private-assignment",
  }], count: 1, error: null });
  const result = await searchGyms({});
  expect(query.select).toHaveBeenCalledWith(expect.stringContaining(", search_order"));
  expect(result.gyms[0].id).toBe("public");
  expect(JSON.stringify(result)).not.toMatch(/search_order|private-|source_url|captured_name/);
});
