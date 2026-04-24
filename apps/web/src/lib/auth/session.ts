import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "./firebase-admin";

export type FirebaseRole = "admin" | "user";

export async function getFirebaseSessionUser(): Promise<DecodedIdToken | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    return await getAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}

export async function requireFirebaseSession(redirectTo: string) {
  const user = await getFirebaseSessionUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
}

export function getFirebaseRole(user: DecodedIdToken): FirebaseRole {
  if (user.role === "admin" || user.admin === true) {
    return "admin";
  }

  return "user";
}

export function isAdminUser(user: DecodedIdToken) {
  return getFirebaseRole(user) === "admin";
}

export async function requireAdminSession(loginRedirectTo: string, fallbackTo: string) {
  const user = await getFirebaseSessionUser();

  if (!user) {
    redirect(loginRedirectTo);
  }

  if (!isAdminUser(user)) {
    redirect(fallbackTo);
  }

  return user;
}
