import { afterEach, describe, expect, it } from "vitest";

import {
  buildSeoMetadata,
  getBaseUrl,
  getLocalizedAlternates,
  getLocalizedPath,
  getLocalizedUrl,
} from "./seo";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  }
});

describe("getBaseUrl", () => {
  it("uses the Gymory production URL by default", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getBaseUrl()).toBe("https://gymory.io");
  });

  it("uses the configured URL and removes trailing slashes", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://preview.gymory.io///";
    expect(getBaseUrl()).toBe("https://preview.gymory.io");
  });
});

describe("localized paths and URLs", () => {
  it.each([
    ["en", "/", "/en"],
    ["zh-HK", "", "/zh-HK/"],
    ["en", "gyms/example", "/en/gyms/example"],
    ["zh-HK", "/search", "/zh-HK/search"],
  ])("builds %s + %s as %s", (locale, path, expected) => {
    expect(getLocalizedPath(locale, path)).toBe(expected);
  });

  it("builds a localized absolute URL without duplicate host slashes", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://preview.gymory.io/";
    expect(getLocalizedUrl("zh-HK", "/gyms/example")).toBe(
      "https://preview.gymory.io/zh-HK/gyms/example"
    );
  });
});

describe("localized metadata", () => {
  it("builds canonical, language, and x-default alternates", () => {
    expect(getLocalizedAlternates("zh-HK", "/search")).toEqual({
      canonical: "/zh-HK/search",
      languages: {
        en: "/en/search",
        "zh-HK": "/zh-HK/search",
        "x-default": "/en/search",
      },
    });
  });

  it("preserves SEO fields and maps zh-HK Open Graph locales", () => {
    const metadata = buildSeoMetadata({
      locale: "zh-HK",
      path: "/search",
      title: "搜尋健身室",
      description: "Gymory search",
      robots: { index: false },
    });

    expect(metadata).toMatchObject({
      title: "搜尋健身室",
      description: "Gymory search",
      alternates: {
        canonical: "/zh-HK/search",
      },
      openGraph: {
        title: "搜尋健身室",
        description: "Gymory search",
        url: "/zh-HK/search",
        locale: "zh_HK",
        alternateLocale: ["en_US"],
      },
      twitter: {
        card: "summary",
        title: "搜尋健身室",
        description: "Gymory search",
      },
      robots: { index: false },
    });
  });

  it("falls back to the English Open Graph locale", () => {
    const metadata = buildSeoMetadata({
      locale: "unsupported",
      title: "Title",
      description: "Description",
    });

    expect(metadata.openGraph).toMatchObject({ locale: "en_US" });
  });
});
