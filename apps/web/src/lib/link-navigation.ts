import type { MouseEvent } from "react";

/** Preserve native new-tab/window and browser modifier-click behavior. */
export function isPlainLinkClick(event: Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented">) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
