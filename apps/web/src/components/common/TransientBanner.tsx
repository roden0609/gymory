"use client";

import { useEffect, useState } from "react";

type TransientBannerProps = {
  message: string;
  tone?: "success" | "error";
  durationMs?: number;
  clearQueryKeys?: string[];
};

export function TransientBanner({
  message,
  tone = "success",
  durationMs = 4000,
  clearQueryKeys = [],
}: TransientBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (clearQueryKeys.length === 0) return;

    const url = new URL(window.location.href);

    for (const key of clearQueryKeys) {
      url.searchParams.delete(key);
    }

    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [clearQueryKeys]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsVisible(false);
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [durationMs]);

  if (!isVisible) return null;

  const className =
    tone === "error"
      ? "mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      : "mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700";

  return <div className={className}>{message}</div>;
}
