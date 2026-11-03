import { describe, expect, it } from "vitest";
import { equipmentImageFileType, primaryEquipmentImageUrl, type EquipmentReviewImage } from "./equipment-image-review";
import { equipmentOfficialReviewSchema, equipmentReviewImageSchema } from "./admin-equipment-validation";

describe("equipment image review",()=>{
  const image:EquipmentReviewImage={id:"image",image_role:"official",url:"https://manufacturer.example/original.jpg",source_url:null,storage_path:null,is_primary:true,sort_order:0};
  it("only publishes Storage images explicitly selected as primary",()=>{
    expect(primaryEquipmentImageUrl("https://example.supabase.co",[image])).toBeNull();
    expect(primaryEquipmentImageUrl("https://example.supabase.co",[{...image,storage_path:"equipment/image/a b.jpg",is_primary:false}])).toBeNull();
    expect(primaryEquipmentImageUrl("https://example.supabase.co/",[{...image,storage_path:"equipment/image/a b.jpg"}]))
      .toBe("https://example.supabase.co/storage/v1/object/public/equipment-images/equipment/image/a%20b.jpg");
  });
  it("rejects HTML and SVG regardless of the supplied file extension",()=>{
    expect(equipmentImageFileType(new TextEncoder().encode('<svg>not a bitmap</svg>'))).toBeNull();
    expect(equipmentImageFileType(new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]))).toBe("png");
    expect(equipmentImageFileType(new TextEncoder().encode('RIFF1234WEBP'))).toBe("webp");
  });
  const identity={id:"123e4567-e89b-42d3-a456-426614174000",expected_updated_at:"2026-11-02T01:00:00+00:00"};
  it("keeps research status separate from admin approval and requires an official name to approve",()=>{
    const review={...identity,official_name:"",official_model_number:"",official_product_url:"",official_review_note:"",official_status:"candidate_requires_review",verify:false};
    expect(equipmentOfficialReviewSchema.safeParse(review).success).toBe(true);
    expect(equipmentOfficialReviewSchema.safeParse({...review,verify:true}).success).toBe(false);
    expect(equipmentOfficialReviewSchema.safeParse({...review,official_status:"admin_verified"}).success).toBe(false);
    expect(equipmentOfficialReviewSchema.safeParse({...review,official_name:"Glute Bridge",verify:true}).success).toBe(true);
  });
  it("requires valid roles and HTTP source URLs for image editing",()=>{
    const row={...identity,image_role:"official",url:"https://manufacturer.example/image.webp",source_url:""};
    expect(equipmentReviewImageSchema.safeParse(row).success).toBe(true);
    expect(equipmentReviewImageSchema.safeParse({...row,url:"javascript:alert(1)"}).success).toBe(false);
    expect(equipmentReviewImageSchema.safeParse({...row,image_role:"admin_verified"}).success).toBe(false);
  });
});
