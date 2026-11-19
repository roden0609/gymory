import { expect, it } from "vitest";
import { isPlainLinkClick } from "./link-navigation";

const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
it("only intercepts normal link activation", () => {
  expect(isPlainLinkClick(plain)).toBe(true);
  for (const key of ["metaKey", "ctrlKey", "shiftKey", "altKey", "defaultPrevented"] as const) {
    expect(isPlainLinkClick({ ...plain, [key]: true })).toBe(false);
  }
  expect(isPlainLinkClick({ ...plain, button: 1 })).toBe(false);
  expect(isPlainLinkClick({ ...plain, button: 2 })).toBe(false);
});
