"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import type { GymSummary } from "@gymory/shared";

export type GymListSnapshot = {
  key: string;
  firstPageKey: string;
  gyms: GymSummary[];
  loadedPage: number;
  scrollY: number;
};
type GymNavigation = {
  pendingSlug: string | null;
  openGym: (slug: string) => void;
  backToResults: () => boolean;
  saveList: (snapshot: GymListSnapshot) => void;
  getList: (key: string, firstPageKey: string) => GymListSnapshot | null;
};
const Context = createContext<GymNavigation | null>(null);

export function GymNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const opening = useRef<string | null>(null);
  const origin = useRef<{ slug: string } | null>(null);
  // One volatile, already-public list snapshot. No storage, shared server cache,
  // or additional request; a different list replaces it and a reload clears it.
  const list = useRef<GymListSnapshot | null>(null);
  const saveList = useCallback((snapshot: GymListSnapshot) => { list.current = snapshot; }, []);
  const getList = useCallback((key: string, firstPageKey: string) => {
    const snapshot = list.current;
    return snapshot?.key === key && snapshot.firstPageKey === firstPageKey ? snapshot : null;
  }, []);
  const openGym = useCallback((nextSlug: string) => {
    if (opening.current === nextSlug) return;
    opening.current = nextSlug;
    origin.current = { slug: nextSlug };
    setSlug(nextSlug);
    startTransition(() => router.push(`/gyms/${nextSlug}`));
  }, [router]);
  const backToResults = useCallback(() => {
    const from = origin.current;
    if (!from || !window.location.pathname.endsWith(`/gyms/${from.slug}`) || window.history.length <= 1) return false;
    opening.current = null;
    setSlug(null);
    router.back();
    return true;
  }, [router]);

  // Reset the duplicate-click guard once navigation settles (including Back).
  useEffect(() => { if (!pending) opening.current = null; }, [pending]);

  return <Context.Provider value={{ pendingSlug: pending ? slug : null, openGym, backToResults, saveList, getList }}>{children}</Context.Provider>;
}

export function useGymNavigation() {
  const navigation = useContext(Context);
  if (!navigation) throw new Error("Gym links require GymNavigationProvider");
  return navigation;
}
