import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  query: { select: vi.fn(), eq: vi.fn(), single: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireAdminSession: mocks.authorize }));
vi.mock("@/lib/db/supabase-admin", () => ({ createAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));
import { deleteEquipmentType, saveEquipmentType, saveMachine } from "./actions";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ locale: "en", code: "custom_type", ...values })) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue(mocks.query);
  mocks.rpc.mockResolvedValue({ data: "123e4567-e89b-42d3-a456-426614174001", error: null });
  for (const method of [mocks.query.select, mocks.query.eq, mocks.query.insert, mocks.query.update, mocks.query.delete]) method.mockReturnValue(mocks.query);
  mocks.query.single.mockResolvedValue({ data: { code: "custom_type" }, error: null });
});

describe("equipment type admin actions", () => {
  it("creates and updates types without updating the primary key", async () => {
    const values = { name_en: " Custom type ", name_zh: "", category: "other" };
    await expect(saveEquipmentType(form(values))).rejects.toThrow("result=success&entity=type");
    expect(mocks.query.insert).toHaveBeenCalledWith({ code: "custom_type", name_en: "Custom type", name_zh: null, category: "other", labels: [] });
    await expect(saveEquipmentType(form({ ...values, mode: "update" }))).rejects.toThrow("result=success&entity=type");
    expect(mocks.query.update).toHaveBeenCalledWith({ name_en: "Custom type", name_zh: null, category: "other", labels: [] });
    expect(mocks.query.eq).toHaveBeenCalledWith("code", "custom_type");
  });

  it("rejects invalid categories before writing", async () => {
    await expect(saveEquipmentType(form({ name_en: "Example", category: "invented" }))).rejects.toThrow("reason=invalid");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("blocks deletion when equipment exists", async () => {
    mocks.query.eq.mockResolvedValueOnce({ count: 1, error: null });
    await expect(deleteEquipmentType(form({}))).rejects.toThrow("reason=related&action=delete");
    expect(mocks.query.delete).not.toHaveBeenCalled();
  });

  it("deletes an empty type", async () => {
    mocks.query.eq.mockResolvedValueOnce({ count: 0, error: null });
    await expect(deleteEquipmentType(form({}))).rejects.toThrow("result=success&entity=type&action=delete");
    expect(mocks.query.delete).toHaveBeenCalledOnce();
    expect(mocks.query.eq).toHaveBeenLastCalledWith("code", "custom_type");
  });

  it("reports a concurrent equipment insert or other database dependency as blocked", async () => {
    mocks.query.eq.mockResolvedValueOnce({ count: 0, error: null });
    mocks.query.single.mockResolvedValueOnce({ error: { message: "foreign key constraint violation" } });
    await expect(deleteEquipmentType(form({}))).rejects.toThrow("reason=related&action=delete");
  });

  it("does not delete if counting equipment fails", async () => {
    mocks.query.eq.mockResolvedValueOnce({ count: null, error: { message: "offline" } });
    await expect(deleteEquipmentType(form({}))).rejects.toThrow("reason=unknown&action=delete");
    expect(mocks.query.delete).not.toHaveBeenCalled();
  });

  it("preserves the current page and category after saving", async () => {
    await expect(saveEquipmentType(form({
      name_en: "Example", category: "other", catalog_page: "3", catalog_category: "other",
    }))).rejects.toThrow("result=success&entity=type&action=save&page=3&category=other");
  });

  it("preserves pagination after a failed save or deletion", async () => {
    await expect(saveEquipmentType(form({ catalog_page: "2", catalog_category: "other" })))
      .rejects.toThrow("reason=invalid&action=save&page=2&category=other");
    mocks.query.eq.mockResolvedValueOnce({ count: 0, error: null });
    await expect(deleteEquipmentType(form({ catalog_page: "2", catalog_category: "other" })))
      .rejects.toThrow("action=delete&page=2&category=other");
  });

  it("discards invalid pagination context in redirects", async () => {
    await expect(saveEquipmentType(form({
      name_en: "Example", category: "other", catalog_page: "-2", catalog_category: "invented",
    }))).rejects.toThrow(/action=save$/);
  });

  it("preserves equipment filters after a failed save", async () => {
    const brand = "123e4567-e89b-42d3-a456-426614174000";
    await expect(saveMachine(form({ catalog_page: "2", catalog_brand: brand, catalog_equipmentType: "chest_press_machine", catalog_status: "active" })))
      .rejects.toThrow(`action=save&page=2&brand=${brand}&equipmentType=chest_press_machine&status=active`);
  });

  it("saves the machine, multiple additional capabilities and aliases with one atomic RPC", async () => {
    const data = form({ brand_id: "123e4567-e89b-42d3-a456-426614174000", equipment_type_code: "chest_fly_machine",
      name: "Combo fly", status: "active", source_type: "manual", aliases: "Fly\nFly" });
    data.append("additional_type_codes", "reverse_fly_machine");
    data.append("additional_type_codes", "bicep_curl_machine");
    await expect(saveMachine(data)).rejects.toThrow("result=success&entity=machine");
    expect(mocks.rpc).toHaveBeenCalledWith("save_equipment_catalog_machine", expect.objectContaining({
      p_id: null, p_machine: expect.objectContaining({ primary_type_code: "chest_fly_machine" }), p_additional_codes: ["reverse_fly_machine", "bicep_curl_machine"], p_aliases: ["Fly"],
    }));
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it("rejects a primary type repeated as an additional capability before writes", async () => {
    const data = form({ brand_id: "123e4567-e89b-42d3-a456-426614174000", equipment_type_code: "chest_fly_machine",
      name: "Combo fly", status: "active", source_type: "manual", aliases: "" });
    data.append("additional_type_codes", "chest_fly_machine");
    await expect(saveMachine(data)).rejects.toThrow("reason=invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("requires admin access before reading or writing", async () => {
    mocks.authorize.mockRejectedValue(new Error("unauthorized"));
    await expect(deleteEquipmentType(form({}))).rejects.toThrow("unauthorized");
    await expect(saveEquipmentType(form({}))).rejects.toThrow("unauthorized");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
