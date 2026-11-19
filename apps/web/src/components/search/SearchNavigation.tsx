"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getSearchTarget } from "@/lib/search-target";

type Target = ReturnType<typeof getSearchTarget>;
type SearchNavigation = {
  searchParams: URLSearchParams;
  target: Target | null;
  isPending: boolean;
  failed: boolean;
  navigate: (href: string, options?: { replace?: boolean; scroll?: boolean }) => void;
  retry: () => void;
};
const NavigationContext = createContext<SearchNavigation | null>(null);

export function SearchNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const committedParams = useSearchParams();
  const committedKey = getSearchTarget(`${pathname}?${committedParams}`).key;
  const [target, setTarget] = useState<Target | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastNavigation = useRef<{ href: string; replace?: boolean; scroll?: boolean } | null>(null);

  useEffect(() => {
    if (target?.key === committedKey) setTarget(null);
  }, [committedKey, target]);

  const navigate = useCallback((href: string, options: { replace?: boolean; scroll?: boolean } = {}) => {
    lastNavigation.current = { href, ...options };
    const next = getSearchTarget(href);
    setTarget(next);
    // Keep existing results mounted. Next's router supersedes older navigations;
    // urgent checkbox/input updates are outside this transition.
    startTransition(() => {
      if (options.replace) router.replace(href, { scroll: options.scroll ?? false });
      else router.push(href, { scroll: options.scroll ?? false });
    });
  }, [router]);
  const retry = useCallback(() => {
    const last = lastNavigation.current;
    if (last) navigate(last.href, last);
  }, [navigate]);
  const optimisticTarget = target?.key === committedKey ? null : target;
  const value = useMemo<SearchNavigation>(() => ({
    searchParams: new URLSearchParams(optimisticTarget?.query ?? committedParams.toString()),
    target: optimisticTarget,
    isPending,
    failed: Boolean(optimisticTarget && !isPending),
    navigate,
    retry,
  }), [committedParams, isPending, navigate, optimisticTarget, retry]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useSearchNavigation() {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error("Search controls require SearchNavigationProvider");
  return navigation;
}
