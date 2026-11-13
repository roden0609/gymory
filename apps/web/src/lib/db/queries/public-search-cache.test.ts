import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  caches: [] as Map<string, unknown>[],
  cacheOptions: [] as { revalidate: number; tags: string[] }[],
  from: vi.fn(), sessionClient: vi.fn(),
  results: [] as unknown[],
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>, _key: string[], options: { revalidate: number; tags: string[] }) => {
    const entries = new Map<string, unknown>();
    mocks.caches.push(entries);
    mocks.cacheOptions.push(options);
    return async (...args: unknown[]) => {
      const key = JSON.stringify(args);
      if (entries.has(key)) return entries.get(key);
      const value = await fn(...args);
      entries.set(key, value);
      return value;
    };
  },
}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("../supabase-server", () => ({ createClient: mocks.sessionClient }));
vi.mock("../supabase-public", () => ({ createPublicClient: () => ({ from: mocks.from }) }));
import { getEquipmentCategoryFilterOptions, getEquipmentMachineSuggestions } from "./equipment-catalog-search";
import { getGymBrandOverview } from "./gym-brand-pages";

beforeEach(() => {
  vi.clearAllMocks();
  for (const entries of mocks.caches) entries.clear();
  mocks.results = [];
  mocks.from.mockImplementation(() => {
    const result = mocks.results.shift();
    const query: Record<string, unknown> = { then: (resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    for (const method of ["select", "eq", "order", "or"]) query[method] = () => query;
    return query;
  });
});

describe("anonymous shared search caches", () => {
  it("reuses suggestions and returns only approved public labels", async () => {
    mocks.results = [
      { data: [{ id: "one", name: "Approved name", captured_name: "private-name" }], error: null },
      { data: [{ equipment_id: "one", alias: "Approved alias" }], error: null },
    ];
    const expected = [{ label: "Approved name", machineName: "Approved name" }, { label: "Approved alias", machineName: "Approved name" }];
    expect(await getEquipmentMachineSuggestions()).toEqual(expected);
    expect(await getEquipmentMachineSuggestions()).toEqual(expected);
    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(mocks.sessionClient).not.toHaveBeenCalled();
    expect(mocks.cacheOptions).toContainEqual({ revalidate: 60, tags: ["public-search-catalog"] });
  });

  it("does not cache catalog errors as empty results", async () => {
    mocks.results = [
      { data: null, error: { code: "57014" } }, { data: [], error: null },
      { data: [{ id: "one", name: "Recovered" }], error: null }, { data: [], error: null },
    ];
    expect(await getEquipmentMachineSuggestions()).toEqual([]);
    expect(await getEquipmentMachineSuggestions()).toEqual([{ label: "Recovered", machineName: "Recovered" }]);
    expect(mocks.from).toHaveBeenCalledTimes(4);
  });

  it("caches category fallback as explicit fields and can be invalidated", async () => {
    mocks.results = [
      { data: null, error: { code: "42703" } },
      { data: [{ slug: "cardio", name: "Cardio", internal: "private" }], error: null },
    ];
    expect(await getEquipmentCategoryFilterOptions()).toEqual([{ slug: "cardio", name: "Cardio", name_zh: null }]);
    await getEquipmentCategoryFilterOptions();
    expect(mocks.from).toHaveBeenCalledTimes(2);
    for (const entries of mocks.caches) entries.clear();
    mocks.results = [{ data: [{ slug: "new", name: "Updated", name_zh: null }], error: null }];
    expect(await getEquipmentCategoryFilterOptions()).toEqual([{ slug: "new", name: "Updated", name_zh: null }]);
  });

  it("keys brand summaries by slug and never reads the request session", async () => {
    mocks.results = [
      { data: [{ district_code: "HK-YTM", rack_count: 2 }], error: null },
      { data: [], error: null },
    ];
    expect((await getGymBrandOverview("24-7-fitness"))?.totalCount).toBe(1);
    expect((await getGymBrandOverview("24-7-fitness"))?.totalCount).toBe(1);
    expect((await getGymBrandOverview("anytime-fitness"))?.totalCount).toBe(0);
    expect(await getGymBrandOverview("unknown-brand")).toBeNull();
    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(mocks.sessionClient).not.toHaveBeenCalled();
  });
});
