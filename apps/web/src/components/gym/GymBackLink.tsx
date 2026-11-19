"use client";

import { isPlainLinkClick } from "@/lib/link-navigation";

import { Link } from "@/i18n/navigation";
import { useGymNavigation } from "@/components/search/GymNavigation";

export function GymBackLink({ children }: { children: React.ReactNode }) {
  const { backToResults } = useGymNavigation();
  return <Link href="/search" className="inline-flex min-h-10 items-center text-sm text-gray-500 transition-colors hover:text-gray-900"
    onClick={(event) => {
      if (!isPlainLinkClick(event)) return;
      if (backToResults()) event.preventDefault();
    }}>{children}</Link>;
}
