import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseSessionUser, isAdminUser } from "@/lib/auth/session";
import {
  buildGymPatchFromPayload,
  getMissingRequiredGymInfoFields,
  type SubmissionPayload,
} from "@/lib/db/gym-submissions";
import {
  recordFirstContributorIfNeeded,
  refreshContributorStats,
} from "@/lib/db/contributor-stats";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { ensureAppUser } from "@/lib/db/users";
import { toSlug } from "@/lib/utils/slug";

const reviewActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNotes: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getFirebaseSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = reviewActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review action" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const adminAppUser = await ensureAppUser(user, adminSupabase);
  const { data: submission, error: submissionError } = await adminSupabase
    .from("gym_update_submissions")
    .select("id, gym_id, submitted_by_user_id, submission_type, status, payload")
    .eq("id", params.id)
    .single();

  if (submissionError || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.status !== "pending") {
    return NextResponse.json(
      { error: "Submission has already been reviewed" },
      { status: 409 }
    );
  }

  try {
    let approvedGymId = submission.gym_id;

    if (parsed.data.action === "approve") {
      approvedGymId = await applySubmission(
        adminSupabase,
        submission.gym_id,
        submission.submission_type,
        (submission.payload ?? {}) as SubmissionPayload,
        user
      );
    }

    const { error: reviewError } = await adminSupabase
      .from("gym_update_submissions")
      .update({
        gym_id: approvedGymId,
        status: parsed.data.action === "approve" ? "approved" : "rejected",
        reviewed_by_user_id: adminAppUser.id,
        reviewed_at: new Date().toISOString(),
        review_notes: parsed.data.reviewNotes ?? null,
      })
      .eq("id", submission.id);

    if (reviewError) {
      throw new Error(reviewError.message);
    }

    if (parsed.data.action === "approve" && submission.submitted_by_user_id) {
      await recordFirstContributorIfNeeded({
        supabase: adminSupabase,
        gymId: approvedGymId,
        userId: submission.submitted_by_user_id,
        submissionId: submission.id,
        submissionType: submission.submission_type,
        payload: (submission.payload ?? {}) as SubmissionPayload,
      });
      await refreshContributorStats(
        submission.submitted_by_user_id,
        adminSupabase
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Review failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok" });
}

async function applySubmission(
  supabase: ReturnType<typeof createAdminClient>,
  gymId: string | null,
  submissionType: string,
  payload: SubmissionPayload,
  _user: NonNullable<Awaited<ReturnType<typeof getFirebaseSessionUser>>>
) {
  const missingRequiredFields = getMissingRequiredGymInfoFields(payload);
  if (missingRequiredFields.length > 0) {
    throw new Error(
      `Missing required gym fields: ${missingRequiredFields.join(", ")}`
    );
  }

  const submittedName = payload.gym?.name;
  const submittedCountryCode = payload.gym?.country_code;
  const patch = buildGymPatchFromPayload(payload);
  const brandSlugs = getSubmittedBrandSlugs(payload);

  if (submissionType === "add_gym") {
    const name = typeof submittedName === "string" ? submittedName : null;
    if (!name) {
      throw new Error("Missing gym name in submission");
    }

    const slug = await generateUniqueSlug(supabase, name);
    const insertPayload = {
      ...patch,
      name,
      slug,
      country_code:
        typeof submittedCountryCode === "string" ? submittedCountryCode : "HK",
      data_source: "user_submission",
      is_active: true,
      is_verified: false,
      last_reported_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("gyms")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create gym");
    }

    const insertedGymId = data.id as string;
    await replaceGymBrands(supabase, insertedGymId, brandSlugs);
    return insertedGymId;
  }

  if (!gymId) {
    throw new Error("Missing gym_id for update submission");
  }

  const { data: existing, error: existingError } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", gymId)
    .single();

  if (existingError || !existing) {
    throw new Error(existingError?.message ?? "Gym not found");
  }

  const { data: updated, error } = await supabase
    .from("gyms")
    .update({
      ...patch,
      data_source: "user_submission",
      last_reported_at: new Date().toISOString(),
    })
    .eq("id", gymId)
    .select("*")
    .single();

  if (error || !updated) {
    throw new Error(error?.message ?? "Failed to update gym");
  }

  await replaceGymBrands(supabase, gymId, brandSlugs);

  return gymId;
}

function getSubmittedBrandSlugs(payload: SubmissionPayload): string[] {
  const values = payload.brands;
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function replaceGymBrands(
  supabase: ReturnType<typeof createAdminClient>,
  gymId: string,
  brandSlugs: string[]
) {
  const { error: clearError } = await supabase
    .from("gym_brand_inventory")
    .delete()
    .eq("gym_id", gymId);
  if (clearError) throw new Error(clearError.message);

  if (brandSlugs.length === 0) return;

  const { data: brands, error: brandsError } = await supabase
    .from("equipment_brands")
    .select("id, slug")
    .in("slug", brandSlugs);

  if (brandsError) throw new Error(brandsError.message);

  const brandIds = (brands ?? []).map((brand) => brand.id as string);
  if (brandIds.length === 0) return;

  const rows = brandIds.map((brandId) => ({
    gym_id: gymId,
    brand_id: brandId,
    confidence: "reported" as const,
  }));

  const { error: upsertError } = await supabase
    .from("gym_brand_inventory")
    .upsert(rows, { onConflict: "gym_id,brand_id" });
  if (upsertError) throw new Error(upsertError.message);
}

async function generateUniqueSlug(
  supabase: ReturnType<typeof createAdminClient>,
  name: string
) {
  const baseSlug = toSlug(name);
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from("gyms")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
