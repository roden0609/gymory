import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseRole } from "@/lib/auth/session";
import { createAdminClient } from "./supabase-admin";

type AppUserRow = {
  id: string;
  firebase_uid: string;
  firebase_email: string;
  firebase_login_type: "google" | null;
  role: "admin" | "basic";
};

export async function ensureAppUser(
  user: DecodedIdToken,
  supabase = createAdminClient()
): Promise<AppUserRow> {
  const payload = {
    firebase_uid: user.uid,
    firebase_email: user.email ?? `${user.uid}@unknown.local`,
    firebase_login_type: getFirebaseLoginType(user),
    role: getFirebaseRole(user) === "admin" ? "admin" : "basic",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "firebase_uid" })
    .select("id, firebase_uid, firebase_email, firebase_login_type, role")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to upsert app user");
  }

  return data as AppUserRow;
}

function getFirebaseLoginType(user: DecodedIdToken) {
  const provider = user.firebase?.sign_in_provider;
  return provider === "google.com" ? "google" : null;
}
