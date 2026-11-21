import Image from "next/image";
import type { ReactNode } from "react";
import { deleteEquipmentImage, saveOfficialReview, saveReviewImage } from "@/app/[locale]/admin/equipment/actions";
import { OFFICIAL_STATUSES, equipmentStorageImageUrl, primaryEquipmentImage, type EquipmentOfficialReview } from "@/lib/equipment-image-review";
import { EquipmentDisplayImageForm, EquipmentImageSelection, SelectEquipmentDisplayImage } from "./EquipmentDisplayImageForm";
import type { EquipmentFilters } from "@/lib/admin-equipment-filters";

const input = "min-h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900";
const button = "min-h-10 max-w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
function httpUrl(value: string | null) {
  try { const url = new URL(value || ""); return ["https:","http:"].includes(url.protocol) ? value! : null; } catch { return null; }
}

function DeleteImageForm({ zh, context, id, revision, displayId, nextDisplayId, replacementUrl, clearsApproval }: {
  zh: boolean; context: ReactNode; id: string; revision?: string;
  displayId?: string; nextDisplayId?: string; replacementUrl?: string; clearsApproval?: boolean;
}) {
  return <details className="min-w-0">
    <summary className="cursor-pointer text-sm font-medium text-red-700">{zh ? "刪除圖片" : "Delete image"}</summary>
    <form action={deleteEquipmentImage} className="mt-2 min-w-0 space-y-2 rounded-lg border border-red-200 p-3">
      {context}
      <input type="hidden" name="image_id" value={id} />
      <input type="hidden" name="image_kind" value={revision ? "review" : "private"} />
      <input type="hidden" name="image_updated_at" value={revision ?? ""} />
      <input type="hidden" name="display_id" value={displayId ?? ""} />
      <input type="hidden" name="next_display_id" value={nextDisplayId ?? ""} />
      <p className="break-words text-sm">{zh ? "刪除後無法復原。" : "This deletion cannot be undone."}</p>
      {id === displayId ? <div className="min-w-0 space-y-2 text-sm">
        {replacementUrl ? <>
          <p>{zh ? "刪除後公開頁會顯示呢張圖。" : "The public page will show this image after deletion."}</p>
          <Image src={replacementUrl} unoptimized width={160} height={120}
            className="h-auto max-w-full rounded border border-gray-200"
            alt={zh ? "刪除後展示嘅圖片" : "Image shown after deletion"} />
        </> : <p>{zh ? "刪除後公開頁將冇圖片。" : "The public page will have no image after deletion."}</p>}
        <p>{zh ? "要用另一張圖，可以先將嗰張圖設為展示主圖。" : "To use a different image, set it as primary first."}</p>
      </div> : null}
      {clearsApproval ? <p className="text-sm">{zh ? "刪除後需要重新核對官方資料。" : "Deleting this image withdraws official approval."}</p> : null}
      <button type="submit" className="min-h-10 max-w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">{zh ? "確認刪除圖片" : "Confirm deletion"}</button>
    </form>
  </details>;
}

export function EquipmentImageReview({ machine, locale, page, filters = {}, capturedImages = [] }: {
  capturedImages?: { id: string; hasStorage: boolean }[];
  machine: EquipmentOfficialReview; locale: string; page: number; filters?: EquipmentFilters;
}) {
  const zh = locale === "zh-HK";
  const displayImage = primaryEquipmentImage(machine.equipment_images);
  const fallbackImage = primaryEquipmentImage(machine.equipment_images.filter(image => image.id !== displayImage?.id));
  const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const currentImage = machine.equipment_images.find(image => image.id === displayImage?.id);
  const displayUrl = storageBase && displayImage?.storage_path
    ? equipmentStorageImageUrl(storageBase, displayImage.storage_path)
    : undefined;
  const fallbackUrl = storageBase && fallbackImage?.storage_path
    ? equipmentStorageImageUrl(storageBase, fallbackImage.storage_path)
    : undefined;

  const imageGroups = (["captured", "official"] as const).map(role => ({
    role,
    images: machine.equipment_images.filter(image => image.image_role === role)
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
      .map((image, index) => ({
        ...image,
        label: role === "captured"
          ? (zh ? `擷取來源圖 ${index + 1}` : `Captured source image ${index + 1}`)
          : (zh ? `官方／官方候選圖 ${index + 1}` : `Official / candidate image ${index + 1}`),
      })),
  }));
  const options = [...imageGroups].reverse().flatMap(({ images }) => images
    .filter(image => httpUrl(image.url))
    .map(image => ({ id: image.id, label: image.label, url: image.url, stored: Boolean(image.storage_path) })));
  const initialId = options.find(image => image.id === displayImage?.id)?.id ?? options[0]?.id ?? "";

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
    <form action={saveOfficialReview} data-equipment-editor="review" className="grid min-w-0 gap-3 sm:grid-cols-2">
      {context}
      <label className="min-w-0 text-sm">{zh ? "官方名稱" : "Official name"}<input name="official_name" maxLength={200} defaultValue={machine.official_name ?? ""} className={input} /></label>
      <label className="min-w-0 text-sm">{zh ? "官方中文名稱（官方未提供則留空）" : "Official Chinese name (leave blank if unavailable)"}<input name="official_name_zh" maxLength={200} defaultValue={machine.official_name_zh ?? ""} className={input} /></label>
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
    <EquipmentImageSelection initialImageId={initialId} key={initialId}>
      <section className="min-w-0 space-y-3 rounded-lg border border-gray-200 p-3">
        <h4 className="font-medium">{zh ? "公開展示圖片" : "Public display image"}</h4>
        <div className={displayUrl ? "grid min-w-0 gap-4 sm:grid-cols-2" : "min-w-0 space-y-3"}>
          {displayUrl ? <div className="min-w-0 space-y-2">
            <a href={displayUrl} target="_blank" rel="noreferrer" className="block min-w-0">
              <Image src={displayUrl} unoptimized width={640} height={480}
                className="aspect-[4/3] h-auto w-full max-w-full rounded-lg bg-gray-50 object-contain"
                alt={zh ? "公開頁目前顯示嘅器材圖片" : "Equipment image currently shown on public pages"} />
            </a>
            <p className="text-sm text-gray-600">{currentImage?.is_primary
              ? (zh ? "手動指定主圖" : "Manually selected primary image")
              : (zh ? "自動採用官方圖" : "Automatically selected official image")}</p>
          </div> : <p className="text-sm text-gray-500">{zh ? "目前冇公開展示圖片。" : "No image is currently displayed publicly."}</p>}
          <EquipmentDisplayImageForm zh={zh} context={context} images={options} currentId={displayImage?.id}
            manuallySelected={Boolean(currentImage?.is_primary)} />
        </div>
      </section>
      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        {imageGroups.map(({ role, images }) => <section key={role} className="min-w-0 max-w-full space-y-3 rounded-lg border border-gray-200 p-3">
          <h4 className="font-medium">{role === "captured" ? (zh ? "擷取原圖（只限管理員）" : "Captured originals (admin only)") : (zh ? "官方／官方候選圖片" : "Official / candidate images")}</h4>
          {role === "captured" ? capturedImages.map(image => <article key={image.id} className="min-w-0 space-y-2 border-b border-gray-100 pb-4">
            {image.hasStorage ? <a href={`/api/admin/equipment-captured-images/${image.id}`} target="_blank" rel="noopener noreferrer" className="block min-w-0 max-w-full">
              <Image src={`/api/admin/equipment-captured-images/${image.id}`} unoptimized width={640} height={480}
                alt={zh ? "擷取器材圖片（僅限管理員）" : "Captured equipment (admin only)"}
                className="aspect-[4/3] h-auto w-full max-w-full rounded-lg bg-gray-50 object-contain" />
            </a> : <p className="text-sm text-gray-500">{zh ? "等待私人圖片回填" : "Private image upload pending"}</p>}
            <a href={`/api/admin/equipment-captured-images/${image.id}?original=1`} target="_blank" rel="noopener noreferrer"
              className="block break-words text-sm text-blue-700 underline">{zh ? "開啟擷取來源原圖（僅限管理員）" : "Open original source image (admin only)"}</a>
            <DeleteImageForm zh={zh} context={context} id={image.id} />
          </article>) : null}
          {images.map(image => <article key={image.id} className="min-w-0 space-y-3 border-b border-gray-100 pb-4">
            {role === "captured" ? <h5 className="text-sm font-medium">{image.label}</h5> : null}
            {httpUrl(image.url) ? <a href={image.url} target="_blank" rel="noreferrer" className="block min-w-0 max-w-full">
              <Image src={image.url} unoptimized width={640} height={480} alt={role === "captured" ? (zh ? "擷取器材圖片" : "Captured equipment") : (zh ? "官方器材圖片候選" : "Official equipment candidate")}
                className="aspect-[4/3] h-auto w-full max-w-full rounded-lg bg-gray-50 object-contain" />
            </a> : <p className="text-sm text-gray-500">{zh ? "圖片網址無效" : "Invalid image URL"}</p>}
            {image.id !== displayImage?.id ? <p className="break-words text-sm text-gray-600">
              {image.storage_path ? (zh ? "已上傳 Storage" : "Uploaded to Storage") : (zh ? "未上傳 Storage" : "Not uploaded to Storage")}
            </p> : null}
            {httpUrl(image.source_url) ? <a href={image.source_url!} target="_blank" rel="noreferrer" className="block break-words text-sm text-blue-700 underline [overflow-wrap:anywhere]">{zh ? "查看來源頁" : "View source page"}</a> : null}
            <details className="min-w-0"><summary className="cursor-pointer text-sm">{zh ? "修改圖片網址" : "Edit image URL"}</summary>
              <form action={saveReviewImage} className="mt-2 min-w-0 space-y-2">{context}<input type="hidden" name="image_id" value={image.id} /><input type="hidden" name="image_role" value={role} />
                <label className="block min-w-0 text-sm">{zh ? "原始圖片網址" : "Original image URL"}<input type="url" name="url" required maxLength={4000} defaultValue={image.url} className={input} /></label>
                <label className="block min-w-0 text-sm">{zh ? "來源頁" : "Source page"}<input type="url" name="source_url" maxLength={4000} defaultValue={image.source_url ?? ""} className={input} /></label>
                <button className={button}>{zh ? "儲存圖片資料" : "Save image details"}</button>
              </form>
            </details>
            {httpUrl(image.url) ? <SelectEquipmentDisplayImage id={image.id}>{zh ? "選用此圖" : "Use this image"}</SelectEquipmentDisplayImage> : null}
            <DeleteImageForm zh={zh} context={context} id={image.id} revision={image.updated_at}
              displayId={displayImage?.id} nextDisplayId={image.id === displayImage?.id ? fallbackImage?.id : displayImage?.id}
              replacementUrl={fallbackUrl} clearsApproval={Boolean(machine.official_verified_at)} />
          </article>)}
          {!images.length && !(role === "captured" && capturedImages.length) ? <p className="text-sm text-gray-500">{zh ? "暫無圖片" : "No images yet"}</p> : null}
          <details className="min-w-0"><summary className="cursor-pointer text-sm">{zh ? "新增圖片" : "Add image"}</summary>
            <form action={saveReviewImage} className="mt-2 min-w-0 space-y-2">{context}<input type="hidden" name="image_role" value={role} />
              <label className="block min-w-0 text-sm">{zh ? "圖片網址" : "Image URL"}<input type="url" name="url" required maxLength={4000} className={input} /></label>
              <label className="block min-w-0 text-sm">{zh ? "來源頁" : "Source page"}<input type="url" name="source_url" maxLength={4000} className={input} /></label>
              <button className={button}>{zh ? "新增圖片" : "Add image"}</button>
            </form>
          </details>
        </section>)}
      </div>
    </EquipmentImageSelection>
  </section>;
}
