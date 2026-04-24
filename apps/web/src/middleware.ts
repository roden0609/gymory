import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes — middleware can only do a lightweight cookie gate.
  // Route handlers / server pages perform the real Firebase session verification.
  if (pathname.match(/^\/(en|zh-HK)\/admin/)) {
    if (!request.cookies.get("session")?.value) {
      const locale = pathname.split("/")[1];
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Let next-intl handle routing for all other requests
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
