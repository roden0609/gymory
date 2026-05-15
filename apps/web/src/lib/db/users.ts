import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseRole } from "@/lib/auth/session";
import { createAdminClient } from "./supabase-admin";

type AppUserRow = {
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
  const payload = {
    firebase_uid: user.uid,
    firebase_email: user.email ?? `${user.uid}@unknown.local`,
    firebase_login_type: getFirebaseLoginType(user),
    display_name: getDisplayName(user),
    handle: getUserHandle(user),
    avatar_url: getAvatarUrl(user),
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
