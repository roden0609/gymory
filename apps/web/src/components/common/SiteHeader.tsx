"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useLocale, useTranslations } from "next-intl";
import { auth } from "@/lib/auth/firebase-client";
import { Link, usePathname } from "@/i18n/navigation";

export function SiteHeader() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("common");
  const tLogin = useTranslations("login");
  const nextLocale = locale === "en" ? "zh-HK" : "en";
  const switchLocaleLabel = locale === "en" ? "中文" : "EN";
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
  }, []);

  const loginHref = useMemo(() => {
    const path = pathname || "/";
    const query = searchParams.toString();
    const pathWithQuery = `${path}${query ? `?${query}` : ""}`;
    const safePath = path.startsWith(`/${locale}`)
      ? pathWithQuery
      : `/${locale}${path === "/" ? "" : path}${query ? `?${query}` : ""}`;

    return {
      pathname: "/login",
      query: { next: safePath },
    };
  }, [locale, pathname, searchParams]);

  const localeSwitchHref = useMemo(() => {
    const query = searchParams.toString();
    return `${pathname || "/"}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      await signOut(auth);
      window.location.assign(`/${locale}`);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold text-gray-900 transition-colors hover:text-gray-700"
        >
          {t("appName")}
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={localeSwitchHref}
            locale={nextLocale}
            aria-label={t("switchLanguage")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {switchLocaleLabel}
          </Link>

          {user?.email ? (
            <span className="hidden text-sm text-gray-500 sm:inline">
              {user.email}
            </span>
          ) : null}

          {isLoading ? (
            <span className="text-sm text-gray-400">{tLogin("loading")}</span>
          ) : user ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {isLoggingOut ? tLogin("loggingOut") : tLogin("logout")}
            </button>
          ) : (
            <Link
              href={loginHref}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              {tLogin("login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
