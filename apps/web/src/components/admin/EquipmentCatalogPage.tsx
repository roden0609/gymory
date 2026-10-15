import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { EQUIPMENT_LABELS, getEquipmentLabel } from "@gymory/shared";
import { saveBrand, saveMachine } from "@/app/[locale]/admin/equipment/actions";

type Brand = {
  id: string; name_en: string; name_zh: string | null; country: string | null;
  website_url: string | null; is_active: boolean;
};
type Category = {
  id: string; name: string; name_zh: string | null; slug: string; parent_id: string | null;
  sort_order: number; is_active: boolean;
};
type EquipmentType = { code: string; name_en: string; name_zh: string | null; category: string; labels: string[] };
type Machine = {
  id: string; brand_id: string; category_id: string; equipment_type_code: string | null;
  labels: string[]; name: string; name_zh: string | null; series: string | null; model_number: string | null;
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
    supabase.from("equipment_types").select("code, name_en, name_zh, category, labels").eq("is_active", true).order("name_en"),
    supabase.from("equipment").select("id, brand_id, category_id, equipment_type_code, name, name_zh, series, model_number, labels, product_url, description, status, source_type, equipment_aliases(alias)").order("name"),
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

export async function EquipmentCatalogPage({ params, searchParams, section }: {
  section: "brands" | "types" | "equipment";
  params: Promise<{ locale: string }>;
  searchParams?: { result?: string; entity?: string; reason?: string };
}) {
  const path = section === "brands" ? "/admin/brands" : section === "types" ? "/admin/equipment-types" : "/admin/equipment";
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminSession(`/${locale}/login?next=/${locale}${path}`, `/${locale}`);
  const tCommon = await getTranslations("common");
  const t = await getTranslations("admin");
  const title = t(section === "brands" ? "manageBrands" : section === "types" ? "manageEquipmentTypes" : "manageEquipments");
  const { brands, categories, equipmentTypes, machines } = await getCatalog();
  const saveMessage = getSaveMessage(locale, searchParams);

  return (
    <main className="min-h-screen overflow-x-clip bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-2">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">{tCommon("back")}</Link>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

        </div>

        {saveMessage ? (
          <div
            role={saveMessage.kind === "success" ? "status" : "alert"}
            className={`fixed inset-x-4 top-20 z-50 mx-auto flex min-w-0 max-w-xl items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              saveMessage.kind === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <span className="min-w-0 break-words">{saveMessage.text}</span>
            <Link
              href={path}
              scroll={false}
              aria-label={locale === "zh-HK" ? "關閉訊息" : "Dismiss message"}
              className="shrink-0 font-semibold opacity-70 hover:opacity-100"
            >
              ×
            </Link>
          </div>
        ) : null}

        {section === "brands" ? <section className="space-y-4">
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
        </section> : null}

        {section === "types" ? <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Categories</h2>
          <div className="flex min-w-0 flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category.id} className="max-w-full break-words rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                {locale === "zh-HK" && category.name_zh ? category.name_zh : category.name}
              </span>
            ))}
          </div>
        </section> : null}

        {section === "types" ? <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Equipment types</h2>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {equipmentTypes.map((type) => (
              <div key={type.code} className="min-w-0 rounded-lg border border-gray-200 bg-white p-3">
                <p className="break-words text-sm font-medium text-gray-900">{locale === "zh-HK" && type.name_zh ? type.name_zh : type.name_en}</p>
                <p className="mt-1 break-words text-xs text-gray-500">{type.category.replace(/_/g, " ")}</p>
                <p className="mt-1 break-words text-xs text-gray-600">{type.labels.map((label) => getEquipmentLabel(label, locale)).join(" · ")}</p>
              </div>
            ))}
          </div>
        </section> : null}

        {section === "equipment" ? <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <MachineForm locale={locale} brands={brands} equipmentTypes={equipmentTypes} />
          <div className="space-y-3">
            {machines.map((machine) => <MachineForm key={machine.id} locale={locale} brands={brands} equipmentTypes={equipmentTypes} machine={machine} />)}
          </div>
        </section> : null}
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

function MachineForm({ locale, brands, equipmentTypes, machine }: {
  locale: string; brands: Brand[]; equipmentTypes: EquipmentType[]; machine?: Machine;
}) {
  return (
    <form action={saveMachine} className="grid min-w-0 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="locale" value={locale} />{machine ? <input type="hidden" name="id" value={machine.id} /> : null}
      <label className={labelClass}>Equipment name<input required name="name" defaultValue={machine?.name ?? ""} className={inputClass} /></label>
      <label className={labelClass}>Chinese name<input name="name_zh" defaultValue={machine?.name_zh ?? ""} className={inputClass} /></label>
      <label className={labelClass}>Brand<select required name="brand_id" defaultValue={machine?.brand_id ?? ""} className={inputClass}><option value="" disabled>Select brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name_en}</option>)}</select></label>
      <label className={labelClass}>Equipment type<select required name="equipment_type_code" defaultValue={machine?.equipment_type_code ?? ""} className={inputClass}><option value="" disabled>Select type</option>{equipmentTypes.map((type) => <option key={type.code} value={type.code}>{locale === "zh-HK" && type.name_zh ? type.name_zh : type.name_en}</option>)}</select></label>
      <fieldset className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-4">
        <legend className="text-sm font-medium text-gray-700">Labels</legend>
        <div className="flex min-w-0 flex-wrap gap-4">
          {EQUIPMENT_LABELS.map((label) => (
            <label key={label} className="flex min-h-10 items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="labels" value={label} defaultChecked={machine?.labels.includes(label)} className="h-4 w-4" />
              {getEquipmentLabel(label, locale)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={labelClass}>Series<input name="series" defaultValue={machine?.series ?? ""} className={inputClass} /></label>
      <label className={labelClass}>Model number<input name="model_number" defaultValue={machine?.model_number ?? ""} className={inputClass} /></label>
      <label className={labelClass}>Status<select name="status" defaultValue={machine?.status ?? "unknown"} className={inputClass}><option value="unknown">Unknown</option><option value="active">Active</option><option value="discontinued">Discontinued</option></select></label>
      <label className={labelClass}>Source<select name="source_type" defaultValue={machine?.source_type ?? "manual"} className={inputClass}><option value="manual">Manual</option><option value="official">Official</option><option value="user_submitted">User submitted</option></select></label>
      <label className={`${labelClass} sm:col-span-2`}>Product URL<input name="product_url" type="url" defaultValue={machine?.product_url ?? ""} className={inputClass} /></label>
      <label className={`${labelClass} sm:col-span-2`}>Aliases, one per line<textarea name="aliases" rows={3} defaultValue={machine?.equipment_aliases.map(({ alias }) => alias).join("\n") ?? ""} className={`${inputClass} resize-y`} /></label>
      <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>Description<textarea name="description" rows={3} defaultValue={machine?.description ?? ""} className={`${inputClass} resize-y`} /></label>
      <div className="flex justify-end sm:col-span-2 lg:col-span-4"><SubmitButton>{machine ? "Save equipment" : "Add equipment"}</SubmitButton></div>
    </form>
  );
}
