import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogRecordRow } from "./CatalogRecordRow";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_LABELS, getEquipmentLabel } from "@gymory/shared";
import { saveBrand, saveMachine, saveEquipmentType, deleteEquipmentType } from "@/app/[locale]/admin/equipment/actions";

type Brand = {
  id: string; name_en: string; name_zh: string | null; country: string | null;
  website_url: string | null; is_active: boolean;
};
type Category = {
  id: string; name: string; name_zh: string | null; slug: string; parent_id: string | null;
  sort_order: number; is_active: boolean;
};
type EquipmentType = { code: string; name_en: string; name_zh: string | null; category: string; labels: string[]; equipment: { count: number }[] };
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

const PAGE_SIZE = 20;
type CatalogSection = "brands" | "types" | "equipment";
export type CatalogSearchParams = {
  result?: string; entity?: string; reason?: string; action?: string; category?: string; page?: string;
};

async function getCatalog(section: CatalogSection, requestedPage: number, category?: string) {
  const supabase = createAdminClient();
  const table = section === "brands" ? "equipment_brands" : section === "types" ? "equipment_types" : "equipment";
  let countQuery = supabase.from(table).select("*", { count: "exact", head: true });
  if (section === "types") {
    countQuery = countQuery.eq("is_active", true);
    if (category) countQuery = countQuery.eq("category", category);
  }
  const countResult = await countQuery;
  if (countResult.error) throw new Error(countResult.error.message);
  const totalCount = countResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const brandsQuery = supabase.from("equipment_brands").select("id, name_en, name_zh, country, website_url, is_active").order("name_en").order("id");
  let typesQuery = supabase.from("equipment_types").select("code, name_en, name_zh, category, labels, equipment(count)").eq("is_active", true).order("name_en").order("code");
  if (section === "types" && category) typesQuery = typesQuery.eq("category", category);
  const [brandsResult, categoriesResult, typesResult, machinesResult] = await Promise.all([
    section === "brands" ? brandsQuery.range(from, to) : section === "equipment" ? brandsQuery : { data: [], error: null },
    supabase.from("equipment_categories").select("id, name, name_zh, slug, parent_id, sort_order, is_active").order("sort_order").order("name"),
    section === "types" ? typesQuery.range(from, to) : section === "equipment" ? typesQuery : { data: [], error: null },
    section === "equipment" ? supabase.from("equipment").select("id, brand_id, category_id, equipment_type_code, name, name_zh, series, model_number, labels, product_url, description, status, source_type, equipment_aliases(alias)").order("name").order("id").range(from, to) : { data: [], error: null },
  ]);
  const error = brandsResult.error ?? categoriesResult.error ?? typesResult.error ?? machinesResult.error;
  if (error) throw new Error(error.message);
  return {
    page, totalPages, totalCount,
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
  section: CatalogSection;
  params: Promise<{ locale: string }>;
  searchParams?: CatalogSearchParams;
}) {
  const path = section === "brands" ? "/admin/brands" : section === "types" ? "/admin/equipment-types" : "/admin/equipment";
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminSession(`/${locale}/login?next=/${locale}${path}`, `/${locale}`);
  const tCommon = await getTranslations("common");
  const t = await getTranslations("admin");
  const title = t(section === "brands" ? "manageBrands" : section === "types" ? "manageEquipmentTypes" : "manageEquipments");
  const saveMessage = getSaveMessage(locale, searchParams);
  const selectedCategory = section === "types"
    ? EQUIPMENT_CATEGORIES.find((category) => category.code === searchParams?.category)?.code
    : undefined;
  const pageParam = Number(searchParams?.page ?? 1);
  const requestedPage = Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const { brands, categories, equipmentTypes, machines, page, totalPages, totalCount } = await getCatalog(section, requestedPage, selectedCategory);
  const chinese = locale === "zh-HK";
  const tableHeaders = section === "brands"
    ? (chinese ? ["品牌", "國家", "網站", "狀態", "操作"] : ["Brand", "Country", "Website", "Status", "Actions"])
    : section === "types"
      ? (chinese ? ["器材類型", "英文名稱", "分類", "器材數量", "Labels", "操作"] : ["Equipment type", "English name", "Category", "Equipment count", "Labels", "Actions"])
      : (chinese ? ["器材", "品牌", "器材類型", "系列 / 型號", "狀態", "Labels", "操作"] : ["Equipment", "Brand", "Equipment type", "Series / model", "Status", "Labels", "Actions"]);
  const pagination = <CatalogPagination locale={locale} path={path} page={page} totalPages={totalPages} totalCount={totalCount} category={selectedCategory} />;

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
              href={{ pathname: path, query: { page: String(page), ...(selectedCategory ? { category: selectedCategory } : {}) } }}
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
          <CatalogRecordRow title={locale === "zh-HK" ? "新增品牌" : "Add brand"} locale={locale} create>
          <form action={saveBrand} className="grid min-w-0 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="locale" value={locale} /><CatalogContext page={page} category={selectedCategory} />
            <label className={labelClass}>English name<input required name="name_en" className={inputClass} /></label>
            <label className={labelClass}>Chinese name<input name="name_zh" className={inputClass} /></label>
            <label className={labelClass}>Country<input name="country" className={inputClass} /></label>
            <label className={labelClass}>Website<input name="website_url" type="url" className={inputClass} /></label>
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4"><ActiveField /><SubmitButton>Add brand</SubmitButton></div>
          </form>
          </CatalogRecordRow>
          <CatalogTable headers={tableHeaders}>
            {brands.map((brand) => (
              <CatalogRecordRow key={brand.id} columns={tableHeaders.length} locale={locale} title={brand.name_en} subtitle={brand.name_zh}
                summary={<RecordSummary fields={[
                  [locale === "zh-HK" ? "國家" : "Country", brand.country],
                  [locale === "zh-HK" ? "網站" : "Website", brand.website_url],
                  [locale === "zh-HK" ? "狀態" : "Status", brand.is_active ? (locale === "zh-HK" ? "啟用" : "Active") : (locale === "zh-HK" ? "停用" : "Inactive")],
                ]} />}>
              <form action={saveBrand} className="grid min-w-0 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
                <input type="hidden" name="locale" value={locale} /><CatalogContext page={page} category={selectedCategory} /><input type="hidden" name="id" value={brand.id} />
                <label className={labelClass}>English name<input required name="name_en" defaultValue={brand.name_en} className={inputClass} /></label>
                <label className={labelClass}>Chinese name<input name="name_zh" defaultValue={brand.name_zh ?? ""} className={inputClass} /></label>
                <label className={labelClass}>Country<input name="country" defaultValue={brand.country ?? ""} className={inputClass} /></label>
                <label className={labelClass}>Website<input name="website_url" type="url" defaultValue={brand.website_url ?? ""} className={inputClass} /></label>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4"><ActiveField active={brand.is_active} /><SubmitButton>Save brand</SubmitButton></div>
              </form>
              </CatalogRecordRow>
            ))}
          </CatalogTable>
          {pagination}
        </section> : null}

        {section === "types" ? <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Categories</h2>
          <nav aria-label={locale === "zh-HK" ? "篩選器材分類" : "Filter equipment categories"} className="flex min-w-0 flex-wrap gap-2">
            <Link href={path} scroll={false} aria-current={!selectedCategory ? "page" : undefined}
              className={`min-h-10 max-w-full break-words rounded-lg border px-3 py-2 text-sm ${!selectedCategory ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}>
              {locale === "zh-HK" ? "全部" : "All"}
            </Link>
            {categories.map((category) => {
              const code = category.slug.replaceAll("-", "_");
              const selected = selectedCategory === code;
              return (
                <Link key={category.id} href={{ pathname: path, query: { category: code } }} scroll={false}
                  aria-current={selected ? "page" : undefined}
                  className={`min-h-10 max-w-full break-words rounded-lg border px-3 py-2 text-sm ${selected ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}>
                  {locale === "zh-HK" && category.name_zh ? category.name_zh : category.name}
                </Link>
              );
            })}
          </nav>
        </section> : null}

        {section === "types" ? <section key={selectedCategory ?? "all"} className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Equipment types</h2>
          <CatalogRecordRow key={selectedCategory ?? "all"} title={locale === "zh-HK" ? "新增器材類型" : "Add equipment type"} locale={locale} create>
            <EquipmentTypeForm locale={locale} page={page} selectedCategory={selectedCategory} defaultCategory={selectedCategory} />
          </CatalogRecordRow>
          <CatalogTable headers={tableHeaders}>
            {equipmentTypes.map((type) => {
              const category = EQUIPMENT_CATEGORIES.find((item) => item.code === type.category);
              return <CatalogRecordRow key={type.code} columns={tableHeaders.length} locale={locale} title={locale === "zh-HK" && type.name_zh ? type.name_zh : type.name_en} subtitle={type.code}
                summary={<RecordSummary fields={[
                  [locale === "zh-HK" ? "英文名稱" : "English name", type.name_en],
                  [locale === "zh-HK" ? "分類" : "Category", category ? (locale === "zh-HK" ? category.nameZh : category.name) : type.category],
                  [locale === "zh-HK" ? "器材數量" : "Equipment count", String(type.equipment[0]?.count ?? 0)],
                  ["Labels", type.labels.map((label) => getEquipmentLabel(label, locale)).join(", ")],
                ]} />}>
                <EquipmentTypeForm locale={locale} page={page} selectedCategory={selectedCategory} type={type} />
              </CatalogRecordRow>;
            })}
            {equipmentTypes.length === 0 ? <tr><td colSpan={tableHeaders.length} className="px-4 py-6 text-sm text-gray-500">{locale === "zh-HK" ? "呢個分類暫時未有器材類型。" : "No equipment types in this category yet."}</td></tr> : null}
          </CatalogTable>
          {pagination}
        </section> : null}

        {section === "equipment" ? <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <CatalogRecordRow title={locale === "zh-HK" ? "新增器材" : "Add equipment"} locale={locale} create>
            <MachineForm locale={locale} page={page} brands={brands} equipmentTypes={equipmentTypes} />
          </CatalogRecordRow>
          <CatalogTable headers={tableHeaders}>
            {machines.map((machine) => {
              const brand = brands.find((item) => item.id === machine.brand_id);
              const type = equipmentTypes.find((item) => item.code === machine.equipment_type_code);
              return <CatalogRecordRow key={machine.id} columns={tableHeaders.length} locale={locale} title={locale === "zh-HK" && machine.name_zh ? machine.name_zh : machine.name} subtitle={locale === "zh-HK" && machine.name_zh ? machine.name : undefined}
                summary={<RecordSummary fields={[
                  [locale === "zh-HK" ? "品牌" : "Brand", brand ? (locale === "zh-HK" && brand.name_zh ? brand.name_zh : brand.name_en) : machine.brand_id],
                  [locale === "zh-HK" ? "器材類型" : "Equipment type", type ? (locale === "zh-HK" && type.name_zh ? type.name_zh : type.name_en) : machine.equipment_type_code],
                  [locale === "zh-HK" ? "系列 / 型號" : "Series / model", [machine.series, machine.model_number].filter(Boolean).join(" / ")],
                  [locale === "zh-HK" ? "狀態" : "Status", machine.status],
                  ["Labels", machine.labels.map((label) => getEquipmentLabel(label, locale)).join(", ")],
                ]} />}>
                <MachineForm locale={locale} page={page} brands={brands} equipmentTypes={equipmentTypes} machine={machine} />
              </CatalogRecordRow>;
            })}
          </CatalogTable>
          {pagination}
        </section> : null}
      </div>
    </main>
  );
}

function CatalogTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
    <table className="block w-full table-fixed text-sm md:table">
      <thead className="hidden bg-gray-50 text-left text-gray-600 md:table-header-group"><tr>
        {headers.map((header) => <th key={header} scope="col" className="break-words px-4 py-3 font-medium">{header}</th>)}
      </tr></thead>
      <tbody className="block divide-y divide-gray-100 bg-white md:table-row-group">{children}</tbody>
    </table>
  </div>;
}

function RecordSummary({ fields }: { fields: [string, string | null][] }) {
  return <>{fields.map(([label, value]) => {
    const status = label === "Status" || label === "狀態";
    const active = value === "Active" || value === "active" || value === "啟用";
    return <td key={label} className="min-w-0 break-words px-4 py-3 text-gray-600 [overflow-wrap:anywhere]">
      <span className="mb-1 block text-xs text-gray-500 md:hidden">{label}</span>
      {status ? <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{value ?? "—"}</span> : value || "—"}
    </td>;
  })}</>;
}

function CatalogContext({ page, category }: { page: number; category?: string }) {
  return <><input type="hidden" name="catalog_page" value={page} />{category ? <input type="hidden" name="catalog_category" value={category} /> : null}</>;
}

function CatalogPagination({ locale, path, page, totalPages, totalCount, category }: {
  locale: string; path: string; page: number; totalPages: number; totalCount: number; category?: string;
}) {
  const chinese = locale === "zh-HK";
  const href = (target: number) => ({ pathname: path, query: { ...(category ? { category } : {}), ...(target > 1 ? { page: String(target) } : {}) } });
  const items: Array<number | "ellipsis"> = [];
  if (totalPages <= 7) {
    for (let item = 1; item <= totalPages; item++) items.push(item);
  } else {
    items.push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) items.push("ellipsis");
    for (let item = start; item <= end; item++) items.push(item);
    if (end < totalPages - 1) items.push("ellipsis");
    items.push(totalPages);
  }
  const linkClass = "inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors";
  return <div className="space-y-3">
    <p className="text-center text-sm text-gray-500">{chinese ? `共 ${totalCount} 項 · 第 ${page} / ${totalPages} 頁` : `${totalCount} items · Page ${page} of ${totalPages}`}</p>
    {totalPages > 1 ? <nav aria-label={chinese ? "分頁" : "Pagination"} className="mt-2 flex min-w-0 flex-wrap items-center justify-center gap-2">
      <Link href={href(Math.max(1, page - 1))} aria-disabled={page === 1} rel="prev"
        className={`${linkClass} ${page > 1 ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "pointer-events-none border-gray-200 text-gray-300"}`}>
        {chinese ? "上一頁" : "Previous"}
      </Link>
      {items.map((item, index) => item === "ellipsis" ? <span key={`ellipsis-${index}`} className="px-1 text-sm text-gray-400">...</span> : <Link key={item} href={href(item)} aria-current={item === page ? "page" : undefined}
        className={`${linkClass} min-w-10 ${item === page ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>{item}</Link>)}
      <Link href={href(Math.min(totalPages, page + 1))} aria-disabled={page === totalPages} rel="next"
        className={`${linkClass} ${page < totalPages ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "pointer-events-none border-gray-200 text-gray-300"}`}>
        {chinese ? "下一頁" : "Next"}
      </Link>
    </nav> : null}
  </div>;
}

function getSaveMessage(
  locale: string,
  params?: { result?: string; entity?: string; reason?: string; action?: string }
) {
  if (params?.result !== "success" && params?.result !== "error") return null;
  const isChinese = locale === "zh-HK";
  const entity = isChinese
    ? { brand: "品牌", category: "分類", type: "器材類型", machine: "器械" }[params.entity ?? ""] ?? "項目"
    : { brand: "Brand", category: "Category", type: "Equipment type", machine: "Machine" }[params.entity ?? ""] ?? "Item";

  if (params.result === "success") {
    return {
      kind: "success" as const,
      text: params.action === "delete"
        ? (isChinese ? `${entity}已成功刪除。` : `${entity} deleted successfully.`)
        : (isChinese ? `${entity}已成功儲存。` : `${entity} saved successfully.`),
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
    text: isChinese ? `${entity}${params.action === "delete" ? "刪除" : "儲存"}失敗：${reason}` : `${entity} ${params.action === "delete" ? "delete" : "save"} failed: ${reason}`,
  };
}

function MachineForm({ locale, brands, equipmentTypes, machine, page }: {
  page: number; locale: string; brands: Brand[]; equipmentTypes: EquipmentType[]; machine?: Machine;
}) {
  return (
    <form action={saveMachine} className="grid min-w-0 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="locale" value={locale} /><CatalogContext page={page} />{machine ? <input type="hidden" name="id" value={machine.id} /> : null}
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

async function EquipmentTypeForm({ locale, type, defaultCategory, page, selectedCategory }: { page: number; selectedCategory?: string; locale: string; type?: EquipmentType; defaultCategory?: string }) {
  const t = await getTranslations("admin");
  const count = type?.equipment[0]?.count ?? 0;
  return (
    <div className="min-w-0 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <form action={saveEquipmentType} className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="locale" value={locale} /><CatalogContext page={page} category={selectedCategory} />
        <input type="hidden" name="mode" value={type ? "update" : "create"} />
        <label className={labelClass}>Code<input required name="code" readOnly={!!type} pattern="[a-z][a-z0-9_]*" maxLength={120} defaultValue={type?.code ?? ""} className={inputClass} /></label>
        <label className={labelClass}>English name<input required name="name_en" maxLength={120} defaultValue={type?.name_en ?? ""} className={inputClass} /></label>
        <label className={labelClass}>Chinese name<input name="name_zh" defaultValue={type?.name_zh ?? ""} className={inputClass} /></label>
        <label className={labelClass}>Category<select required name="category" defaultValue={type?.category ?? defaultCategory ?? ""} className={inputClass}>
          <option value="" disabled>Select category</option>
          {EQUIPMENT_CATEGORIES.map((category) => <option key={category.code} value={category.code}>{locale === "zh-HK" ? category.nameZh : category.name}</option>)}
        </select></label>
        <fieldset className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-4">
          <legend className="text-sm font-medium text-gray-700">Labels</legend>
          <div className="flex min-w-0 flex-wrap gap-4">
            {EQUIPMENT_LABELS.map((label) => <label key={label} className="flex min-h-10 items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="labels" value={label} disabled={label === "hyrox"} defaultChecked={type?.labels.includes(label)} className="h-4 w-4" />
              {getEquipmentLabel(label, locale)}
            </label>)}
            {type?.labels.includes("hyrox") ? <input type="hidden" name="labels" value="hyrox" /> : null}
          </div>
          <p className="break-words text-xs text-gray-500">{t("typeHyroxNote")}</p>
        </fieldset>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
          {type ? <p className="break-words text-sm text-gray-700">{t("equipmentCount", { count })}</p> : null}
          <SubmitButton>{type ? t("saveType") : t("addType")}</SubmitButton>
        </div>
      </form>
      {type ? <form action={deleteEquipmentType} className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <input type="hidden" name="locale" value={locale} /><CatalogContext page={page} category={selectedCategory} />
        <input type="hidden" name="code" value={type.code} />
        <p className="min-w-0 break-words text-xs text-gray-500">{t(count > 0 ? "typeDeleteBlocked" : "typeDeleteNote")}</p>
        <button type="submit" disabled={count > 0} className="min-h-10 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">{t("deleteType")}</button>
      </form> : null}
    </div>
  );
}
