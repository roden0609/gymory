import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protect admin routes — verifies Firebase session cookie
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const session = request.cookies.get("session");
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // TODO: verify Firebase session cookie via /api/auth/session
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
