import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const noGaCookieName = "gymory_no_ga";

function getNoGaCookieRedirect(request: NextRequest) {
  const noGa = request.nextUrl.searchParams.get("no_ga");
  if (noGa === null) return null;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.searchParams.delete("no_ga");
  const response = NextResponse.redirect(redirectUrl);
  if (noGa === "1" || noGa === "true") {
    response.cookies.set(noGaCookieName, "1", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }

  if (noGa === "0" || noGa === "false") {
    response.cookies.delete({
      name: noGaCookieName,
      path: "/",
    });
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const noGaRedirect = getNoGaCookieRedirect(request);
  if (noGaRedirect) return noGaRedirect;

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
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
