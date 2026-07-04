"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import {
  trackOpenGoogleMaps,
  trackVisitGymWebsite,
  type ExternalGymLinkType,
} from "@/lib/analytics";

type GymLinkTracking =
  | {
      eventName: "open_google_maps";
      gymSlug: string;
      gymName?: string;
      district?: string;
    }
  | {
      eventName: "visit_gym_website";
      gymSlug: string;
      gymName?: string;
      linkType: ExternalGymLinkType;
    };

type TrackedExternalLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "onClick"
> & {
  children: ReactNode;
  tracking: GymLinkTracking;
};

export function TrackedExternalLink({
  children,
  tracking,
  ...props
}: TrackedExternalLinkProps) {
  function handleClick() {
    if (tracking.eventName === "open_google_maps") {
      trackOpenGoogleMaps({
        gym_slug: tracking.gymSlug,
        gym_name: tracking.gymName,
        district: tracking.district,
      });
      return;
    }

    trackVisitGymWebsite({
      gym_slug: tracking.gymSlug,
      gym_name: tracking.gymName,
      link_type: tracking.linkType,
    });
  }

  return (
    <a {...props} onClick={handleClick}>
      {children}
    </a>
  );
}
