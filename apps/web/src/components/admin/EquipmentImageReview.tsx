import Image from "next/image";
import { saveOfficialReview, saveReviewImage, selectReviewImage } from "@/app/[locale]/admin/equipment/actions";
import { OFFICIAL_STATUSES, equipmentStorageImageUrl, type EquipmentOfficialReview } from "@/lib/equipment-image-review";
import type { EquipmentFilters } from "@/lib/admin-equipment-filters";

const input = "min-h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900";
const button = "min-h-10 max-w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
function httpUrl(value: string | null) {
  try { const url = new URL(value || ""); return ["https:","http:"].includes(url.protocol) ? value! : null; } catch { return null; }
}

export function EquipmentImageReview({ machine, locale, page, filters = {} }: {
  machine: EquipmentOfficialReview; locale: string; page: number; filters?: EquipmentFilters;
}) {
  const zh = locale === "zh-HK";
  const context = <><input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={machine.id} />
    <input type="hidden" name="expected_updated_at" value={machine.updated_at} /><input type="hidden" name="catalog_page" value={page} />
    {Object.entries(filters).map(([key,value]) => <input key={key} type="hidden" name={`catalog_${key}`} value={value} />)}</>;
  const labels = zh ? ["未研究","多個型號吻合","候選待核對","型號及圖片已確認","型號已確認，圖片欠確認","未找到可靠對應"] :
    ["Not researched","Ambiguous model","Candidate — review needed","Model and image verified","Model verified, image missing","Unresolved"];
  return <section className="min-w-0 max-w-full space-y-4 rounded-xl border border-gray-200 bg-white p-4">
    <div className="min-w-0 space-y-1 break-words [overflow-wrap:anywhere]">
      <h3 className="font-semibold">{zh ? "官方資料及圖片核對" : "Official data and image review"}</h3>
      <p className="text-sm text-gray-500">{machine.source_external_id || machine.id}</p>
      <p className="text-sm">{machine.official_verified_at
        ? `${zh ? "已人工確認" : "Admin verified"} · ${machine.official_verified_at} · ${machine.official_verified_by || "—"}`
        : zh ? "未人工確認" : "Not admin verified"}</p>
    </div>
    <form action={saveOfficialReview} className="grid min-w-0 gap-3 sm:grid-cols-2">
      {context}
      <label className="min-w-0 text-sm">{zh ? "官方名稱" : "Official name"}<input name="official_name" maxLength={200} defaultValue={machine.official_name ?? ""} className={input} /></label>
      <label className="min-w-0 text-sm">{zh ? "官方型號" : "Official model"}<input name="official_model_number" maxLength={200} defaultValue={machine.official_model_number ?? ""} className={input} /></label>
      <label className="min-w-0 text-sm">{zh ? "官方來源頁" : "Official source page"}<input name="official_product_url" type="url" maxLength={4000} defaultValue={machine.official_product_url ?? ""} className={input} /></label>
      <label className="min-w-0 text-sm">{zh ? "研究結果" : "Research result"}<select name="official_status" defaultValue={machine.official_status} className={input}>
        {OFFICIAL_STATUSES.map((status,index) => <option key={status} value={status}>{labels[index]}</option>)}
      </select></label>
      <label className="min-w-0 text-sm sm:col-span-2">{zh ? "核對備註／型號差異" : "Review notes / model differences"}<textarea name="official_review_note" rows={3} maxLength={5000} defaultValue={machine.official_review_note ?? ""} className={input} /></label>
      <label className="flex min-w-0 items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="verify" defaultChecked={Boolean(machine.official_verified_at)} className="mt-1 shrink-0" />
        <span>{zh ? "我已核對所有官方資料及官方圖片，確認正確（取消勾選可撤回確認）" : "I checked all official data and official images and confirm they are correct (uncheck to withdraw approval)."}</span></label>
      <div className="sm:col-span-2"><button className={button}>{zh ? "儲存核對結果" : "Save review"}</button></div>
    </form>
    <p className="text-sm text-gray-500">{zh ? "兩邊圖片供對比；官方來源唔代表已確認正確。改動圖片或型號資料後須重新確認。展示圖片可獨立選擇。" : "Compare both sources below. An official source is not approval. Image or model changes require a new review. Display-image selection is independent."}</p>
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
      {(["captured","official"] as const).map(role => <section key={role} className="min-w-0 max-w-full space-y-3 rounded-lg border border-gray-200 p-3">
        <h4 className="font-medium">{role === "captured" ? (zh ? "擷取原圖" : "Captured images") : (zh ? "官方／官方候選圖片" : "Official / candidate images")}</h4>
        {machine.equipment_images.filter(image => image.image_role === role).sort((a,b) => a.sort_order-b.sort_order || a.id.localeCompare(b.id)).map(image => <article key={image.id} className="min-w-0 space-y-3 border-b border-gray-100 pb-4">
          {httpUrl(image.url) ? <a href={image.url} target="_blank" rel="noreferrer" className="block min-w-0 max-w-full">
            <Image src={image.url} unoptimized width={640} height={480} alt={role === "captured" ? (zh ? "擷取器材圖片" : "Captured equipment") : (zh ? "官方器材圖片候選" : "Official equipment candidate")}
              className="aspect-[4/3] h-auto w-full max-w-full rounded-lg bg-gray-50 object-contain" />
          </a> : <p className="text-sm text-gray-500">{zh ? "圖片網址無效" : "Invalid image URL"}</p>}
          <p className="break-words text-sm text-gray-600">{image.is_primary ? (zh ? "目前展示主圖" : "Current primary image") : image.storage_path ? (zh ? "已上傳 Storage" : "Uploaded to Storage") : (zh ? "未上傳 Storage" : "Not uploaded to Storage")}</p>
          {httpUrl(image.source_url) ? <a href={image.source_url!} target="_blank" rel="noreferrer" className="block break-words text-sm text-blue-700 underline [overflow-wrap:anywhere]">{zh ? "查看來源頁" : "View source page"}</a> : null}
          {image.storage_path && process.env.NEXT_PUBLIC_SUPABASE_URL ? <a href={equipmentStorageImageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL,image.storage_path)} target="_blank" rel="noreferrer" className="block text-sm text-blue-700 underline">{zh ? "查看 Storage 圖片" : "View Storage image"}</a> : null}
          <details className="min-w-0"><summary className="cursor-pointer text-sm">{zh ? "修改圖片網址" : "Edit image URL"}</summary>
            <form action={saveReviewImage} className="mt-2 min-w-0 space-y-2">{context}<input type="hidden" name="image_id" value={image.id} /><input type="hidden" name="image_role" value={role} />
              <label className="block min-w-0 text-sm">{zh ? "原始圖片網址" : "Original image URL"}<input type="url" name="url" required maxLength={4000} defaultValue={image.url} className={input} /></label>
              <label className="block min-w-0 text-sm">{zh ? "來源頁" : "Source page"}<input type="url" name="source_url" maxLength={4000} defaultValue={image.source_url ?? ""} className={input} /></label>
              <button className={button}>{zh ? "儲存圖片資料" : "Save image details"}</button>
            </form>
          </details>
          <form action={selectReviewImage} className="min-w-0 space-y-2">{context}<input type="hidden" name="image_id" value={image.id} /><input type="hidden" name="expected_url" value={image.url} />
            <label className="block min-w-0 text-sm">{zh ? "上傳選定圖片（JPEG／PNG／WebP，最多 5 MB）" : "Upload selected image (JPEG / PNG / WebP, max 5 MB)"}
              <input name="image_file" type="file" accept="image/jpeg,image/png,image/webp" required={!image.storage_path} className="mt-1 block w-full min-w-0 max-w-full text-sm file:mr-2 file:rounded file:border-0 file:px-2 file:py-2" /></label>
            <p className="text-xs text-gray-500">{zh ? "可按上方原圖另存圖片後上傳；已有 Storage 圖片可直接選用。" : "Save the original image above and upload it here; an existing Storage image can be selected directly."}</p>
            <button className={button}>{zh ? "上傳／設為展示主圖" : "Upload / use as primary image"}</button>
          </form>
        </article>)}
        {!machine.equipment_images.some(image => image.image_role === role) ? <p className="text-sm text-gray-500">{zh ? "暫無圖片" : "No images yet"}</p> : null}
        <details className="min-w-0"><summary className="cursor-pointer text-sm">{zh ? "新增圖片" : "Add image"}</summary>
          <form action={saveReviewImage} className="mt-2 min-w-0 space-y-2">{context}<input type="hidden" name="image_role" value={role} />
            <label className="block min-w-0 text-sm">{zh ? "圖片網址" : "Image URL"}<input type="url" name="url" required maxLength={4000} className={input} /></label>
            <label className="block min-w-0 text-sm">{zh ? "來源頁" : "Source page"}<input type="url" name="source_url" maxLength={4000} className={input} /></label>
            <button className={button}>{zh ? "新增圖片" : "Add image"}</button>
          </form>
        </details>
      </section>)}
    </div>
  </section>;
}
