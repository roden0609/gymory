import { NextRequest, NextResponse } from "next/server";
import { getFirebaseSessionUser } from "@/lib/auth/session";
import {
  buildChangedFields,
  buildGymPatchFromPayload,
  getMissingRequiredGymInfoFields,
  insertSubmissionRecord,
  type SubmissionPayload,
} from "@/lib/db/gym-submissions";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { ensureAppUser } from "@/lib/db/users";
import { submissionSchema } from "@gymory/shared";

// POST /api/submissions — authenticated user submits a gym or equipment update
export async function POST(request: NextRequest) {
  const user = await getFirebaseSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data.payload as SubmissionPayload;
  const missingRequiredFields = getMissingRequiredGymInfoFields(payload);
  if (missingRequiredFields.length > 0) {
    return NextResponse.json(
      {
        error: `Missing required gym fields: ${missingRequiredFields.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    const appUser = await ensureAppUser(user, supabase);
    const patch = buildGymPatchFromPayload(payload);
    const existingGym = parsed.data.gymId
      ? await fetchGymById(supabase, parsed.data.gymId)
      : null;
    const existingBrandSlugs = parsed.data.gymId
      ? await fetchGymBrandSlugs(supabase, parsed.data.gymId)
      : [];
    const submittedBrandSlugs = normalizeBrandSlugs(payload.brands);
    const actionType = parsed.data.submissionType === "add_gym" ? "I" : "U";
    const baseChangedFields =
      actionType === "I" ? patch : buildChangedFields(existingGym, patch);
    const changedFields = mergeBrandChanges({
      baseChangedFields,
      actionType,
      existingBrandSlugs,
      submittedBrandSlugs,
    });

    if (actionType === "U" && !changedFields) {
      return NextResponse.json(
        { error: "Please change at least one field before submitting." },
        { status: 400 }
      );
    }

    await insertSubmissionRecord({
      supabase,
      gymId: parsed.data.gymId ?? null,
      submittedByUserId: appUser.id,
      submissionType: parsed.data.submissionType,
      status: "pending",
      actorType: "user_submission",
      actionType,
      payload,
      changedFields,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submit failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok" }, { status: 201 });
}

async function fetchGymById(
  supabase: ReturnType<typeof createAdminClient>,
  gymId: string
) {
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", gymId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Gym not found");
  }

  return data as Record<string, unknown>;
}

async function fetchGymBrandSlugs(
  supabase: ReturnType<typeof createAdminClient>,
  gymId: string
) {
  const { data, error } = await supabase
    .from("gym_brand_inventory")
    .select("equipment_brands(slug)")
    .eq("gym_id", gymId);

  if (error || !data) return [];

  return data
    .flatMap((row) => row.equipment_brands ?? [])
    .map((brand) => brand.slug)
    .filter((slug): slug is string => typeof slug === "string");
}

function normalizeBrandSlugs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeBrandChanges({
  baseChangedFields,
  actionType,
  existingBrandSlugs,
  submittedBrandSlugs,
}: {
  baseChangedFields: Record<string, unknown> | null;
  actionType: "I" | "U";
  existingBrandSlugs: string[];
  submittedBrandSlugs: string[];
}) {
  const changed = { ...(baseChangedFields ?? {}) } as Record<string, unknown>;

  if (actionType === "I") {
    if (submittedBrandSlugs.length > 0) {
      changed.brand_slugs = submittedBrandSlugs;
    }
    return Object.keys(changed).length > 0 ? changed : null;
  }

  const existingSet = new Set(existingBrandSlugs);
  const submittedSet = new Set(submittedBrandSlugs);

  const added = submittedBrandSlugs.filter((slug) => !existingSet.has(slug));
  const removed = existingBrandSlugs.filter((slug) => !submittedSet.has(slug));

  if (added.length > 0 || removed.length > 0) {
    changed.brand_slugs = submittedBrandSlugs;
    changed.brand_slugs_added = added;
    changed.brand_slugs_removed = removed;
  }

  return Object.keys(changed).length > 0 ? changed : null;
}
