import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";

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

  // Protect admin routes — check Supabase session first
  if (pathname.match(/^\/(en|zh-HK)\/admin/)) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const locale = pathname.split("/")[1];
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  // Let next-intl handle routing for all other requests
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
