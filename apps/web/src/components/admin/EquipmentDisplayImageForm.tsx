"use client";

import { createContext, useContext, useRef, useState, type ReactNode, type RefObject } from "react";
import { selectReviewImage } from "@/app/[locale]/admin/equipment/actions";

const ImageSelection = createContext<{
  selectedId: string;
  selectImage: (id: string) => void;
  sourceSelect: RefObject<HTMLSelectElement>;
} | null>(null);

export function EquipmentImageSelection({ initialImageId, children }: {
  initialImageId: string; children: ReactNode;
}) {
  const [selectedId, selectImage] = useState(initialImageId);
  const sourceSelect = useRef<HTMLSelectElement>(null);
  return <ImageSelection.Provider value={{ selectedId, selectImage, sourceSelect }}>{children}</ImageSelection.Provider>;
}

export function SelectEquipmentDisplayImage({ id, children }: { id: string; children: ReactNode }) {
  const selection = useContext(ImageSelection);
  return <button type="button" className="min-h-10 text-sm font-medium text-blue-700 underline" onClick={() => {
    selection?.selectImage(id);
    selection?.sourceSelect.current?.scrollIntoView({ block: "center" });
    selection?.sourceSelect.current?.focus({ preventScroll: true });
  }}>{children}</button>;
}

type DisplayImageOption = { id: string; label: string; url: string; stored: boolean };

export function EquipmentDisplayImageForm({ zh, context, images, currentId, manuallySelected }: {
  zh: boolean; context: ReactNode; images: DisplayImageOption[]; currentId?: string; manuallySelected: boolean;
}) {
  const selection = useContext(ImageSelection);
  const selected = images.find(image => image.id === selection?.selectedId) ?? images[0];
  if (!selected) return <p className="text-sm text-gray-600">
    {zh ? "喺下方新增一張來源圖片，就可以上傳同設定主圖。" : "Add a source image below to upload and set a primary image."}
  </p>;

  return <form action={selectReviewImage} className="min-w-0 space-y-3">
    {context}
    <label className="block min-w-0 text-sm">
      {zh ? "選擇來源圖片" : "Choose source image"}
      <select ref={selection?.sourceSelect} name="image_id" value={selected.id}
        onChange={event => selection?.selectImage(event.target.value)}
        className="mt-1 block min-h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2">
        {images.map(image => <option key={image.id} value={image.id}>{image.label}</option>)}
      </select>
    </label>
    <input type="hidden" name="expected_url" value={selected.url} />
    <ImageUpload key={selected.id} zh={zh} stored={selected.stored}
      replacing={selected.id === currentId && manuallySelected} />
  </form>;
}

function ImageUpload({ zh, stored, replacing }: { zh: boolean; stored: boolean; replacing: boolean }) {
  const [hasFile, setHasFile] = useState(false);
  const uploadRequired = !stored || replacing;
  const label = replacing
    ? (zh ? "更換展示圖片" : "Replace displayed image")
    : !stored || hasFile
      ? (zh ? "上傳並設為展示主圖" : "Upload and set as primary")
      : (zh ? "設為展示主圖" : "Set as primary image");
  return <>
    <label className="block min-w-0 text-sm">
      {zh ? "上傳圖片（JPEG／PNG／WebP，最多 5 MB）" : "Upload image (JPEG / PNG / WebP, max 5 MB)"}
      {!uploadRequired ? (zh ? "（可選）" : " (optional)") : null}
      <input name="image_file" type="file" accept="image/jpeg,image/png,image/webp" required={uploadRequired}
        onChange={event => setHasFile(Boolean(event.target.files?.length))}
        className="mt-1 block w-full min-w-0 max-w-full text-sm file:mr-2 file:rounded file:border-0 file:px-2 file:py-2" />
    </label>
    <button type="submit" className="min-h-10 max-w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
      {label}
    </button>
  </>;
}
