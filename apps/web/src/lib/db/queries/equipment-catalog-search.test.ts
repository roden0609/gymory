import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ results: [] as unknown[], calls: [] as { table: string; method: string; args: unknown[] }[] }));
vi.mock("../supabase-server", () => ({ createClient: async () => ({
  from: (table: string) => {
    const result = mocks.results.shift();
    const query: Record<string, unknown> = { then: (resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    for (const method of ["select", "eq", "in", "ilike"]) query[method] = (...args: unknown[]) => { mocks.calls.push({ table, method, args }); return query; };
    return query;
  },
}) }));
import { getCatalogSearchGymIds } from "./equipment-catalog-search";
beforeEach(() => { mocks.results = []; mocks.calls = []; });
describe("category search across all assigned capabilities", () => {
  it("matches secondary categories and returns each gym once", async () => {
    mocks.results = [
      { data: [{ code: "reverse_fly_machine" }, { code: "shoulder_press_machine" }], error: null },
      { data: [{ equipment_id: "combo" }, { equipment_id: "combo" }], error: null },
      { data: [{ gym_id: "gym" }, { gym_id: "gym" }], error: null },
    ];
    expect(await getCatalogSearchGymIds({ category: "shoulder" })).toEqual(new Set(["gym"]));
    expect(mocks.calls).toContainEqual({ table: "equipment_type_assignments", method: "in", args: ["equipment_type_code", ["reverse_fly_machine", "shoulder_press_machine"]] });
    expect(mocks.calls).toContainEqual({ table: "gym_equipment_inventory", method: "in", args: ["equipment_id", ["combo"]] });
  });
  it("fails closed if assignment lookup fails", async () => {
    mocks.results = [{ data: [{ code: "reverse_fly_machine" }], error: null }, { data: null, error: { message: "offline" } }];
    expect(await getCatalogSearchGymIds({ category: "shoulder" })).toEqual(new Set());
  });
});
