export const OFFICIAL_STATUSES = ["not_researched", "ambiguous_model", "candidate_requires_review", "model_verified", "model_verified_image_missing", "unresolved"] as const;
export type OfficialStatus = typeof OFFICIAL_STATUSES[number];
export const EQUIPMENT_IMAGE_BUCKET = "equipment-images";
export type EquipmentReviewImage = {
  id: string; image_role: "captured" | "official"; url: string; source_url: string | null;
  storage_path: string | null; is_primary: boolean; sort_order: number;
};
export type EquipmentOfficialReview = {
  id: string; updated_at: string; source_external_id: string | null;
  captured_name: string | null; captured_name_zh: string | null;
  official_name: string | null; official_name_zh: string | null; official_model_number: string | null;
  official_product_url: string | null; official_status: OfficialStatus;
  official_review_note: string | null; official_verified_at: string | null; official_verified_by: string | null;
  equipment_images: EquipmentReviewImage[];
};

export function equipmentStorageImageUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${EQUIPMENT_IMAGE_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

// Keep the public read path independent of manufacturer hosts and admin approval.
export function primaryEquipmentImageUrl(base: string, images: EquipmentReviewImage[]): string | null {
  const image = images.find(image => image.is_primary && image.storage_path);
  return image?.storage_path ? equipmentStorageImageUrl(base, image.storage_path) : null;
}

export function equipmentImageFileType(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if ([137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value)) return "png";
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start,end));
  return ascii(0,4) === "RIFF" && ascii(8,12) === "WEBP" ? "webp" : null;
}
