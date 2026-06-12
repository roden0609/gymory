"use client";

import { useRouter } from "@/i18n/navigation";

type BackButtonProps = {
  children: React.ReactNode;
  fallbackHref: string;
  className?: string;
};

export function BackButton({
  children,
  fallbackHref,
  className,
}: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button type="button" onClick={handleBack} className={className}>
      {children}
    </button>
  );
}
