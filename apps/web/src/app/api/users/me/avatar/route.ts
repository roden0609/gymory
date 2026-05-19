import { NextRequest, NextResponse } from "next/server";
import { getFirebaseSessionUser } from "@/lib/auth/session";
import { getClientIp, hashIpAddress } from "@/lib/db/queries/gym-accuracy";
import { createAdminClient } from "@/lib/db/supabase-admin";
import {
  ensureAppUser,
  getAvatarStoragePath,
  insertUserProfileAuditEvent,
  updateAppUserAvatar,
  validateAvatarFile,
} from "@/lib/db/users";

const AVATAR_BUCKET = "user-avatars";

export async function POST(request: NextRequest) {
  const user = await getFirebaseSessionUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "avatar_file_required" }, { status: 400 });
  }

  const fileError = validateAvatarFile(file);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  const supabase = createAdminClient();
  const appUser = await ensureAppUser(user, supabase);
  const path = getAvatarStoragePath(appUser.id, file.type);
  if (!path) {
    return NextResponse.json({ error: "avatar_file_type_invalid" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: "avatar_upload_failed" }, { status: 500 });
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  const updatedUser = await updateAppUserAvatar({
    userId: appUser.id,
    avatarUrl,
    supabase,
  });

  await insertUserProfileAuditEvent({
    userId: appUser.id,
    actorUserId: appUser.id,
    oldValues: { avatar_url: appUser.avatar_url },
    newValues: { avatar_url: updatedUser.avatar_url },
    ipHash: hashIpAddress(getClientIp(request.headers)),
    userAgent: request.headers.get("user-agent"),
    supabase,
  });

  return NextResponse.json({
    user: {
      avatarUrl: updatedUser.avatar_url,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getFirebaseSessionUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUser = await ensureAppUser(user, supabase);
  const updatedUser = await updateAppUserAvatar({
    userId: appUser.id,
    avatarUrl: null,
    supabase,
  });

  await insertUserProfileAuditEvent({
    userId: appUser.id,
    actorUserId: appUser.id,
    oldValues: { avatar_url: appUser.avatar_url },
    newValues: { avatar_url: null },
    ipHash: hashIpAddress(getClientIp(request.headers)),
    userAgent: request.headers.get("user-agent"),
    supabase,
  });

  return NextResponse.json({
    user: {
      avatarUrl: updatedUser.avatar_url,
    },
  });
}
