import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { AdminRemoveGymMachineForm } from "@/components/admin/AdminRemoveGymMachineForm";
import { saveGymMachine } from "./actions";

type CatalogMachine = {
  id: string;
  name: string;
  model_number: string | null;
  status: string;
  equipment_brands: { name_en: string } | null;
  equipment_categories: { name: string } | null;
};

type InventoryRow = {
  equipment_id: string;
  quantity: number | null;
  condition: "good" | "fair" | "poor" | "unknown" | null;
  notes: string | null;
  verified_status: string;
  verified_at: string | null;
  equipment: CatalogMachine | null;
};

const inputClass =
  "min-h-10 min-w-0 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900";
const labelClass = "min-w-0 space-y-1 text-sm font-medium text-gray-700";

async function getGymInventory(gymId: string) {
  const supabase = createAdminClient();
  const [gymResult, machinesResult, inventoryResult] = await Promise.all([
    supabase.from("gyms").select("id, name, name_zh, slug, is_active").eq("id", gymId).maybeSingle(),
    supabase
      .from("equipment")
      .select("id, name, model_number, status, equipment_brands(name_en), equipment_categories(name)")
      .neq("status", "discontinued")
      .order("name"),
    supabase
      .from("gym_equipment_inventory")
      .select("equipment_id, quantity, condition, notes, verified_status, verified_at, equipment(id, name, model_number, status, equipment_brands(name_en), equipment_categories(name))")
      .eq("gym_id", gymId)
      .order("updated_at", { ascending: false }),
  ]);
  const error = gymResult.error ?? machinesResult.error ?? inventoryResult.error;
  if (error) throw new Error(error.message);
  return {
    gym: gymResult.data as { id: string; name: string; name_zh: string | null; slug: string; is_active: boolean } | null,
    machines: (machinesResult.data ?? []) as unknown as CatalogMachine[],
    inventory: (inventoryResult.data ?? []) as unknown as InventoryRow[],
  };
}

export default async function AdminGymEquipmentPage({ params, searchParams }: {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: { result?: string; action?: string; reason?: string };
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdminSession(
    `/${locale}/login?next=/${locale}/admin/gyms/${id}/equipment`,
    `/${locale}`
  );
  const tCommon = await getTranslations("common");
  const { gym, machines, inventory } = await getGymInventory(id);
  if (!gym) notFound();
  const assignedIds = new Set(inventory.map((row) => row.equipment_id));
  const availableMachines = machines.filter((machine) => !assignedIds.has(machine.id));
  const isChinese = locale === "zh-HK";
  const message = getResultMessage(isChinese, searchParams);

  return (
    <main className="min-h-screen overflow-x-clip bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <Link href="/admin/gyms" className="text-sm text-gray-500 hover:text-gray-900">
            {tCommon("back")}
          </Link>
          <h1 className="break-words text-2xl font-bold text-gray-900">
            {isChinese ? gym.name_zh ?? gym.name : gym.name}
          </h1>
          <p className="text-sm text-gray-600">
            {isChinese ? "管理已驗證嘅品牌／型號器械" : "Manage verified brand/model equipment"}
          </p>
        </div>

        {message ? (
          <div role={message.kind === "success" ? "status" : "alert"} className={`flex min-w-0 items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${message.kind === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            <span className="min-w-0 break-words">{message.text}</span>
            <Link href={`/admin/gyms/${id}/equipment`} aria-label={isChinese ? "關閉訊息" : "Dismiss message"} className="shrink-0 font-semibold opacity-70 hover:opacity-100">×</Link>
          </div>
        ) : null}

        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isChinese ? "加入器械" : "Add machine"}
          </h2>
          {availableMachines.length === 0 ? (
            <p className="text-sm text-gray-500">
              {machines.length === 0
                ? isChinese ? "器械目錄未有可用器械，請先建立 machine。" : "No catalog machines are available. Create a machine first."
                : isChinese ? "所有可用器械已經加入呢間 gym。" : "All available machines are already assigned."}
            </p>
          ) : (
            <InventoryForm locale={locale} gymId={id} machines={availableMachines} />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {isChinese ? `已加入器械（${inventory.length}）` : `Assigned machines (${inventory.length})`}
          </h2>
          {inventory.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
              {isChinese ? "未有品牌／型號器械記錄。" : "No brand/model inventory yet."}
            </div>
          ) : inventory.map((row) => (
            <div key={row.equipment_id} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-4 min-w-0">
                <p className="break-words font-semibold text-gray-900">{machineLabel(row.equipment)}</p>
                <p className="mt-1 text-xs text-gray-500">{row.equipment?.equipment_categories?.name ?? "Uncategorized"} · {row.verified_status}</p>
              </div>
              <InventoryForm locale={locale} gymId={id} machines={row.equipment ? [row.equipment] : []} row={row} />
              <AdminRemoveGymMachineForm
                locale={locale}
                gymId={id}
                machineId={row.equipment_id}
                machineName={machineLabel(row.equipment)}
              />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function InventoryForm({ locale, gymId, machines, row }: {
  locale: string; gymId: string; machines: CatalogMachine[]; row?: InventoryRow;
}) {
  const isChinese = locale === "zh-HK";
  return (
    <form action={saveGymMachine} className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="gym_id" value={gymId} />
      {row ? <input type="hidden" name="equipment_id" value={row.equipment_id} /> : (
        <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
          {isChinese ? "器械" : "Machine"}
          <select required name="equipment_id" defaultValue="" className={inputClass}>
            <option value="" disabled>{isChinese ? "選擇器械" : "Select machine"}</option>
            {machines.map((machine) => <option key={machine.id} value={machine.id}>{machineLabel(machine)}</option>)}
          </select>
        </label>
      )}
      <label className={labelClass}>
        {isChinese ? "數量（可留空）" : "Quantity (optional)"}
        <input name="quantity" type="number" min="1" defaultValue={row?.quantity ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        {isChinese ? "狀況" : "Condition"}
        <select name="condition" defaultValue={row?.condition ?? "unknown"} className={inputClass}>
          <option value="unknown">{isChinese ? "未知" : "Unknown"}</option>
          <option value="good">{isChinese ? "良好" : "Good"}</option>
          <option value="fair">{isChinese ? "一般" : "Fair"}</option>
          <option value="poor">{isChinese ? "欠佳" : "Poor"}</option>
        </select>
      </label>
      <label className={`${labelClass} sm:col-span-2`}>
        {isChinese ? "備註" : "Notes"}
        <input name="notes" maxLength={1000} defaultValue={row?.notes ?? ""} className={inputClass} />
      </label>
      <div className="flex justify-end sm:col-span-2 lg:col-span-4">
        <button type="submit" className="min-h-10 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">
          {row ? isChinese ? "儲存器械" : "Save machine" : isChinese ? "加入器械" : "Add machine"}
        </button>
      </div>
    </form>
  );
}

function machineLabel(machine: CatalogMachine | null) {
  if (!machine) return "Unknown machine";
  const brand = machine.equipment_brands?.name_en;
  const model = machine.model_number ? ` (${machine.model_number})` : "";
  return `${brand ? `${brand} ` : ""}${machine.name}${model}`;
}

function getResultMessage(isChinese: boolean, params?: { result?: string; action?: string; reason?: string }) {
  if (params?.result === "success") {
    return { kind: "success" as const, text: params.action === "remove" ? (isChinese ? "器械已成功移除。" : "Machine removed successfully.") : (isChinese ? "器械記錄已成功儲存。" : "Machine inventory saved successfully.") };
  }
  if (params?.result !== "error") return null;
  const reason = params.reason === "invalid"
    ? (isChinese ? "請檢查器械、數量同輸入格式。" : "Check the machine, quantity, and input formats.")
    : params.reason === "duplicate"
      ? (isChinese ? "呢部器械已經加入 gym。" : "This machine is already assigned to the gym.")
      : params.reason === "related"
        ? (isChinese ? "相關器械或 gym 記錄不存在。" : "The related machine or gym record does not exist.")
        : (isChinese ? "暫時未能儲存，請再試一次。" : "Could not save the inventory. Please try again.");
  return { kind: "error" as const, text: reason };
}
