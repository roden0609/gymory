import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseRole } from "@/lib/auth/session";
import { createAdminClient } from "./supabase-admin";

export type AppUserRow = {
  id: string;
  firebase_uid: string;
  firebase_email: string;
  firebase_login_type: "google" | null;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  role: "admin" | "basic";
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
};

export async function ensureAppUser(
  user: DecodedIdToken,
  supabase = createAdminClient()
): Promise<AppUserRow> {
  const now = new Date().toISOString();
  const existingUser = await getAppUserByFirebaseUid(user.uid, supabase);
  const payload = {
    firebase_uid: user.uid,
    firebase_email: user.email ?? `${user.uid}@unknown.local`,
    firebase_login_type: getFirebaseLoginType(user),
    display_name: existingUser?.display_name ?? getDisplayName(user),
    handle: existingUser?.handle ?? getUserHandle(user),
    avatar_url: existingUser?.avatar_url ?? getAvatarUrl(user),
    role: getFirebaseRole(user) === "admin" ? "admin" : "basic",
    updated_at: now,
    last_seen_at: now,
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "firebase_uid" })
    .select(
      "id, firebase_uid, firebase_email, firebase_login_type, display_name, handle, avatar_url, role, created_at, updated_at, last_seen_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to upsert app user");
  }

  return data as AppUserRow;
}

export async function getAppUserByFirebaseUid(
  firebaseUid: string,
  supabase = createAdminClient()
): Promise<AppUserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, firebase_uid, firebase_email, firebase_login_type, display_name, handle, avatar_url, role, created_at, updated_at, last_seen_at"
    )
    .eq("firebase_uid", firebaseUid)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AppUserRow | null) ?? null;
}

export async function updateAppUserProfile({
  userId,
  displayName,
  handle,
  avatarUrl,
  supabase = createAdminClient(),
}: {
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  supabase?: ReturnType<typeof createAdminClient>;
}): Promise<AppUserRow> {
  const { data, error } = await supabase
    .from("users")
    .update({
      display_name: displayName,
      handle,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select(
      "id, firebase_uid, firebase_email, firebase_login_type, display_name, handle, avatar_url, role, created_at, updated_at, last_seen_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update app user profile");
  }

  return data as AppUserRow;
}

export async function insertUserProfileAuditEvent({
  userId,
  actorUserId,
  oldValues,
  newValues,
  ipHash,
  userAgent,
  supabase = createAdminClient(),
}: {
  userId: string;
  actorUserId: string | null;
  oldValues: Record<string, string | null>;
  newValues: Record<string, string | null>;
  ipHash: string | null;
  userAgent: string | null;
  supabase?: ReturnType<typeof createAdminClient>;
}) {
  const { error } = await supabase.from("user_profile_audit_events").insert({
    user_id: userId,
    actor_user_id: actorUserId,
    event_type: "profile_updated",
    old_values: oldValues,
    new_values: newValues,
    ip_hash: ipHash,
    user_agent: userAgent,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateAppUserAvatar({
  userId,
  avatarUrl,
  supabase = createAdminClient(),
}: {
  userId: string;
  avatarUrl: string | null;
  supabase?: ReturnType<typeof createAdminClient>;
}): Promise<AppUserRow> {
  const { data, error } = await supabase
    .from("users")
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select(
      "id, firebase_uid, firebase_email, firebase_login_type, display_name, handle, avatar_url, role, created_at, updated_at, last_seen_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update app user avatar");
  }

  return data as AppUserRow;
}

export function getAvatarStoragePath(userId: string, mimeType: string) {
  const extension = getAvatarFileExtension(mimeType);
  if (!extension) return null;
  return `${userId}/avatar.${extension}`;
}

export function validateAvatarFile(file: File) {
  if (!AVATAR_MIME_TYPES.has(file.type)) return "avatar_file_type_invalid";
  if (file.size > AVATAR_MAX_FILE_SIZE_BYTES) return "avatar_file_too_large";
  return null;
}

export async function isHandleAvailable({
  handle,
  userId,
  supabase = createAdminClient(),
}: {
  handle: string;
  userId: string;
  supabase?: ReturnType<typeof createAdminClient>;
}) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return !data || data.id === userId;
}

export const RESERVED_USER_HANDLES = new Set([
  "account",
  "admin",
  "api",
  "auth",
  "brands",
  "contributors",
  "equipment",
  "gyms",
  "login",
  "logout",
  "search",
  "settings",
  "submit",
  "users",
]);

export function normalizeUserHandle(value: string) {
  return value.trim().toLowerCase();
}

export function validateDisplayName(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 2) return "display_name_too_short";
  if (trimmed.length > 40) return "display_name_too_long";
  return null;
}

export function validateUserHandle(value: string) {
  const handle = normalizeUserHandle(value);
  if (handle.length < 3) return "handle_too_short";
  if (handle.length > 30) return "handle_too_long";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle)) return "handle_invalid";
  if (RESERVED_USER_HANDLES.has(handle)) return "handle_reserved";
  return null;
}

export function normalizeAvatarUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function validateAvatarUrl(value: string | null) {
  if (value === null) return null;
  if (value.length > 500) return "avatar_url_too_long";

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "avatar_url_invalid";
  }

  if (url.protocol !== "https:") return "avatar_url_https_only";
  return null;
}

const AVATAR_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getAvatarFileExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return null;
}

function getFirebaseLoginType(user: DecodedIdToken) {
  const provider = user.firebase?.sign_in_provider;
  return provider === "google.com" ? "google" : null;
}

function getDisplayName(user: DecodedIdToken) {
  const name = typeof user.name === "string" ? user.name.trim() : "";
  if (name) return name;

  const email = typeof user.email === "string" ? user.email.trim() : "";
  if (email) return email.split("@")[0] ?? email;

  return null;
}

function getAvatarUrl(user: DecodedIdToken) {
  const picture = typeof user.picture === "string" ? user.picture.trim() : "";
  return picture || null;
}

function getUserHandle(user: DecodedIdToken) {
  const base =
    slugPart(getDisplayName(user)) ??
    slugPart(user.email?.split("@")[0]) ??
    "contributor";
  const suffix = user.uid.slice(0, 6).toLowerCase();
  return `${base}-${suffix}`;
}

function slugPart(value: string | null | undefined) {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || null;
}
