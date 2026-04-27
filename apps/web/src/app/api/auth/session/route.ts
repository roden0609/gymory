import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/auth/firebase-admin";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { ensureAppUser } from "@/lib/db/users";

// POST /api/auth/session — exchange Firebase ID token for a session cookie
export async function POST(request: NextRequest) {
  const { idToken } = await request.json();
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  const adminAuth = getAdminAuth();
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  await ensureAppUser(decodedToken, createAdminClient());
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

  const response = NextResponse.json({ status: "ok" });
  response.cookies.set("session", sessionCookie, {
    maxAge: expiresIn / 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}

// DELETE /api/auth/session — sign out
export async function DELETE() {
  const response = NextResponse.json({ status: "ok" });
  response.cookies.delete("session");
  return response;
}
