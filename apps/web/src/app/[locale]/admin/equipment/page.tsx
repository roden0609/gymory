import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { saveBrand, saveCategory, saveMachine } from "./actions";

type Brand = {
  id: string; name_en: string; name_zh: string | null; country: string | null;
  website_url: string | null; is_active: boolean;
};
type Category = {
  id: string; name: string; name_zh: string | null; slug: string; parent_id: string | null;
  sort_order: number; is_active: boolean;
};
type EquipmentType = { code: string; name_en: string };
type Machine = {
  id: string; brand_id: string; category_id: string; equipment_type_code: string | null;
  name: string; series: string | null; model_number: string | null;
  product_url: string | null; description: string | null;
  status: "active" | "discontinued" | "unknown";
  source_type: "official" | "manual" | "user_submitted";
  equipment_aliases: { alias: string }[];
};

const inputClass =
  "min-h-10 min-w-0 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900";
const labelClass = "min-w-0 space-y-1 text-sm font-medium text-gray-700";

async function getCatalog() {
  const supabase = createAdminClient();
  const [brandsResult, categoriesResult, typesResult, machinesResult] = await Promise.all([
    supabase.from("equipment_brands").select("id, name_en, name_zh, country, website_url, is_active").order("name_en"),
    supabase.from("equipment_categories").select("id, name, name_zh, slug, parent_id, sort_order, is_active").order("sort_order").order("name"),
    supabase.from("equipment_types").select("code, name_en").eq("is_active", true).order("name_en"),
    supabase.from("equipment").select("id, brand_id, category_id, equipment_type_code, name, series, model_number, product_url, description, status, source_type, equipment_aliases(alias)").order("name"),
  ]);
  const error = brandsResult.error ?? categoriesResult.error ?? typesResult.error ?? machinesResult.error;
  if (error) throw new Error(error.message);
  return {
    brands: (brandsResult.data ?? []) as Brand[],
    categories: (categoriesResult.data ?? []) as Category[],
    equipmentTypes: (typesResult.data ?? []) as EquipmentType[],
    machines: (machinesResult.data ?? []) as Machine[],
  };
}

function ActiveField({ active = true }: { active?: boolean }) {
  return (
    <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-gray-700">
      <input name="is_active" type="checkbox" defaultChecked={active} className="h-4 w-4" />
      Active
    </label>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="submit" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">
      {children}
    </button>
  );
}

export default async function AdminEquipmentPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams?: { result?: string; entity?: string; reason?: string };
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminSession(`/${locale}/login?next=/${locale}/admin/equipment`, `/${locale}`);
  const tCommon = await getTranslations("common");
  const { brands, categories, equipmentTypes, machines } = await getCatalog();
  const saveMessage = getSaveMessage(locale, searchParams);

  return (
    <main className="min-h-screen overflow-x-clip bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-2">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">{tCommon("back")}</Link>
          <h1 className="text-2xl font-bold text-gray-900">Equipment catalog</h1>
          <p className="text-sm text-gray-600">Manage canonical brands, categories, machines, and search aliases.</p>
        </div>

        {saveMessage ? (
          <div
            role={saveMessage.kind === "success" ? "status" : "alert"}
            className={`flex min-w-0 items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
              saveMessage.kind === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <span className="min-w-0 break-words">{saveMessage.text}</span>
            <Link
              href="/admin/equipment"
              aria-label={locale === "zh-HK" ? "關閉訊息" : "Dismiss message"}
              className="shrink-0 font-semibold opacity-70 hover:opacity-100"
            >
              ×
            </Link>
          </div>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Brands</h2>
          <form action={saveBrand} className="grid min-w-0 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
            <input type="hidden" name="locale" value={locale} />
            <label className={labelClass}>English name<input required name="name_en" className={inputClass} /></label>
            <label className={labelClass}>Chinese name<input name="name_zh" className={inputClass} /></label>
            <label className={labelClass}>Country<input name="country" className={inputClass} /></label>
            <label className={`${labelClass} lg:col-span-2`}>Website<input name="website_url" type="url" className={inputClass} /></label>
            <div className="flex flex-wrap items-end gap-3"><ActiveField /><SubmitButton>Add brand</SubmitButton></div>
          </form>
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            {brands.map((brand) => (
              <form key={brand.id} action={saveBrand} className="grid min-w-0 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
                <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={brand.id} />
                <label className={labelClass}>English name<input required name="name_en" defaultValue={brand.name_en} className={inputClass} /></label>
                <label className={labelClass}>Chinese name<input name="name_zh" defaultValue={brand.name_zh ?? ""} className={inputClass} /></label>
                <label className={labelClass}>Country<input name="country" defaultValue={brand.country ?? ""} className={inputClass} /></label>
                <label className={labelClass}>Website<input name="website_url" type="url" defaultValue={brand.website_url ?? ""} className={inputClass} /></label>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2"><ActiveField active={brand.is_active} /><SubmitButton>Save brand</SubmitButton></div>
              </form>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Categories</h2>
          <form action={saveCategory} className="grid min-w-0 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="locale" value={locale} />
            <label className={labelClass}>Name<input required name="name" className={inputClass} /></label>
            <label className={labelClass}>Chinese name<input name="name_zh" className={inputClass} /></label>
            <label className={labelClass}>Parent<select name="parent_id" className={inputClass}><option value="">None</option>{categories.map((category) => <option key={category.id} value={category.id}>{locale === "zh-HK" && category.name_zh ? category.name_zh : category.name}</option>)}</select></label>
            <label className={labelClass}>Sort order<input name="sort_order" type="number" min="0" defaultValue="0" className={inputClass} /></label>
            <ActiveField /><div className="flex items-end"><SubmitButton>Add category</SubmitButton></div>
          </form>
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            {categories.map((category) => (
              <form key={category.id} action={saveCategory} className="grid min-w-0 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
                <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={category.id} />
                <label className={labelClass}>Name<input required name="name" defaultValue={category.name} className={inputClass} /></label>
                <label className={labelClass}>Chinese name<input name="name_zh" defaultValue={category.name_zh ?? ""} className={inputClass} /></label>
                <label className={labelClass}>Parent<select name="parent_id" defaultValue={category.parent_id ?? ""} className={inputClass}><option value="">None</option>{categories.filter((item) => item.id !== category.id).map((item) => <option key={item.id} value={item.id}>{locale === "zh-HK" && item.name_zh ? item.name_zh : item.name}</option>)}</select></label>
                <label className={labelClass}>Sort order<input name="sort_order" type="number" min="0" defaultValue={category.sort_order} className={inputClass} /></label>
                <ActiveField active={category.is_active} />
                <div className="flex justify-end sm:col-span-2"><SubmitButton>Save category</SubmitButton></div>
              </form>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Machines</h2>
          <MachineForm locale={locale} brands={brands} categories={categories} equipmentTypes={equipmentTypes} />
          <div className="space-y-3">
            {machines.map((machine) => <MachineForm key={machine.id} locale={locale} brands={brands} categories={categories} equipmentTypes={equipmentTypes} machine={machine} />)}
          </div>
        </section>
      </div>
    </main>
  );
}

function getSaveMessage(
  locale: string,
  params?: { result?: string; entity?: string; reason?: string }
) {
  if (params?.result !== "success" && params?.result !== "error") return null;
  const isChinese = locale === "zh-HK";
  const entity = isChinese
    ? { brand: "品牌", category: "分類", machine: "器械" }[params.entity ?? ""] ?? "項目"
    : { brand: "Brand", category: "Category", machine: "Machine" }[params.entity ?? ""] ?? "Item";

  if (params.result === "success") {
    return {
      kind: "success" as const,
      text: isChinese ? `${entity}已成功儲存。` : `${entity} saved successfully.`,
    };
  }

  const reason = isChinese
    ? {
        invalid: "請檢查必填欄位及輸入格式。",
        duplicate: "已有相同名稱或識別碼嘅項目。",
        related: "呢項資料仍然連接其他記錄。",
        unknown: "暫時未能儲存，請再試一次。",
      }[params.reason ?? ""] ?? "暫時未能儲存，請再試一次。"
    : {
        invalid: "Check the required fields and input formats.",
        duplicate: "An item with the same name or identifier already exists.",
        related: "This item is still linked to another record.",
        unknown: "Could not save the item. Please try again.",
      }[params.reason ?? ""] ?? "Could not save the item. Please try again.";

  return {
    kind: "error" as const,
    text: isChinese ? `${entity}儲存失敗：${reason}` : `${entity} save failed: ${reason}`,
  };
}

function MachineForm({ locale, brands, categories, equipmentTypes, machine }: {
  locale: string; brands: Brand[]; categories: Category[]; equipmentTypes: EquipmentType[]; machine?: Machine;
}) {
  return (
    <form action={saveMachine} className="grid min-w-0 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="locale" value={locale} />{machine ? <input type="hidden" name="id" value={machine.id} /> : null}
      <label className={labelClass}>Machine name<input required name="name" defaultValue={machine?.name ?? ""} className={inputClass} /></label>
      <label className={labelClass}>Brand<select required name="brand_id" defaultValue={machine?.brand_id ?? ""} className={inputClass}><option value="" disabled>Select brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name_en}</option>)}</select></label>
      <label className={labelClass}>Category<select required name="category_id" defaultValue={machine?.category_id ?? ""} className={inputClass}><option value="" disabled>Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{locale === "zh-HK" && category.name_zh ? category.name_zh : category.name}</option>)}</select></label>
      <label className={labelClass}>Generic equipment type<select name="equipment_type_code" defaultValue={machine?.equipment_type_code ?? ""} className={inputClass}><option value="">None</option>{equipmentTypes.map((type) => <option key={type.code} value={type.code}>{type.name_en} ({type.code})</option>)}</select></label>
      <label className={labelClass}>Series<input name="series" defaultValue={machine?.series ?? ""} className={inputClass} /></label>
      <label className={labelClass}>Model number<input name="model_number" defaultValue={machine?.model_number ?? ""} className={inputClass} /></label>
      <label className={labelClass}>Status<select name="status" defaultValue={machine?.status ?? "unknown"} className={inputClass}><option value="unknown">Unknown</option><option value="active">Active</option><option value="discontinued">Discontinued</option></select></label>
      <label className={labelClass}>Source<select name="source_type" defaultValue={machine?.source_type ?? "manual"} className={inputClass}><option value="manual">Manual</option><option value="official">Official</option><option value="user_submitted">User submitted</option></select></label>
      <label className={`${labelClass} sm:col-span-2`}>Product URL<input name="product_url" type="url" defaultValue={machine?.product_url ?? ""} className={inputClass} /></label>
      <label className={`${labelClass} sm:col-span-2`}>Aliases, one per line<textarea name="aliases" rows={3} defaultValue={machine?.equipment_aliases.map(({ alias }) => alias).join("\n") ?? ""} className={`${inputClass} resize-y`} /></label>
      <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>Description<textarea name="description" rows={3} defaultValue={machine?.description ?? ""} className={`${inputClass} resize-y`} /></label>
      <div className="flex justify-end sm:col-span-2 lg:col-span-4"><SubmitButton>{machine ? "Save machine" : "Add machine"}</SubmitButton></div>
    </form>
  );
}
