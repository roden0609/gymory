"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useLocale, useTranslations } from "next-intl";
import { auth } from "@/lib/auth/firebase-client";
import { Link, usePathname } from "@/i18n/navigation";

type HeaderProfile = {
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export function SiteHeader() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("common");
  const tLogin = useTranslations("login");
  const nextLocale = locale === "en" ? "zh-HK" : "en";
  const switchLocaleLabel = locale === "en" ? "中文" : "EN";
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userLabel =
    profile?.displayName ?? user?.displayName ?? profile?.email ?? user?.email ?? null;
  const userPhotoUrl = profile?.avatarUrl ?? user?.photoURL ?? null;

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser) setProfile(null);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    let isCancelled = false;

    async function loadProfile() {
      const response = await fetch("/api/users/me");
      const body = (await response.json().catch(() => null)) as
        | {
            user?: {
              displayName?: string | null;
              email?: string | null;
              avatarUrl?: string | null;
            } | null;
          }
        | null;

      if (isCancelled || !response.ok || !body?.user) return;

      setProfile({
        displayName: body.user.displayName ?? null,
        email: body.user.email ?? null,
        avatarUrl: body.user.avatarUrl ?? null,
      });
    }

    void loadProfile();
    window.addEventListener("gymory:profile-updated", loadProfile);

    return () => {
      isCancelled = true;
      window.removeEventListener("gymory:profile-updated", loadProfile);
    };
  }, [user]);

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
    <header className="w-full max-w-full overflow-x-hidden border-b border-gray-200 bg-white">
      <div className="mx-auto flex min-w-0 max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold text-gray-900 transition-colors hover:text-gray-700"
        >
          {t("appName")}
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={localeSwitchHref}
            locale={nextLocale}
            aria-label={t("switchLanguage")}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {switchLocaleLabel}
          </Link>

          {userLabel ? (
            <Link
              href="/account"
              aria-label={userLabel}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 sm:w-auto sm:gap-2 sm:px-2 sm:py-1"
            >
              {userPhotoUrl ? (
                <span
                  aria-hidden="true"
                  className="h-7 w-7 rounded-full bg-cover bg-center bg-gray-100"
                  style={{ backgroundImage: `url(${userPhotoUrl})` }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600"
                >
                  {userLabel.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-40 truncate sm:inline">{userLabel}</span>
            </Link>
          ) : null}

          {isLoading ? (
            <span className="min-w-0 truncate text-sm text-gray-400">
              {tLogin("loading")}
            </span>
          ) : user ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 sm:px-4"
            >
              {isLoggingOut ? tLogin("loggingOut") : tLogin("logout")}
            </button>
          ) : (
            <Link
              href={loginHref}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-gray-900 px-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 sm:px-4"
            >
              {tLogin("login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
