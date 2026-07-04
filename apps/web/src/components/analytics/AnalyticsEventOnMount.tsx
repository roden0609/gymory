"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsParams } from "@/lib/analytics";

export function AnalyticsEventOnMount({
  eventName,
  params,
}: {
  eventName: string;
  params?: AnalyticsParams;
}) {
  const serializedParams = JSON.stringify(params ?? {});

  useEffect(() => {
    trackEvent(eventName, params);
    // Track once for the serialized event payload passed by the server page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, serializedParams]);

  return null;
}
