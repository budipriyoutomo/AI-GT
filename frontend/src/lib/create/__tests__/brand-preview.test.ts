import { describe, it, expect } from "vitest";
import { parseBrandPreview, resolveBrandColors, resolveBrandFont, resolveLogoUrl } from "../brand-preview";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";

describe("parseBrandPreview", () => {
  it("returns true when query param is exactly 'true'", () => {
    expect(parseBrandPreview("true")).toBe(true);
  });

  it("returns false when query param is 'false'", () => {
    expect(parseBrandPreview("false")).toBe(false);
  });

  it("returns false when query param is absent (null)", () => {
    expect(parseBrandPreview(null)).toBe(false);
  });

  it("returns false for any other/garbage value", () => {
    expect(parseBrandPreview("1")).toBe(false);
    expect(parseBrandPreview("yes")).toBe(false);
    expect(parseBrandPreview("")).toBe(false);
  });
});

describe("resolveBrandColors", () => {
  it("returns null when preview disabled, regardless of user colors", () => {
    expect(resolveBrandColors(["#111111"], false)).toBeNull();
    expect(resolveBrandColors(null, false)).toBeNull();
  });

  it("returns user's brand colors when enabled and present", () => {
    expect(resolveBrandColors(["#111111", "#222222"], true)).toEqual(["#111111", "#222222"]);
  });

  it("falls back to DEFAULT_COMPANY_PROFILE.brand_colors when enabled but user colors are null", () => {
    expect(resolveBrandColors(null, true)).toEqual(DEFAULT_COMPANY_PROFILE.brand_colors);
  });

  it("falls back to DEFAULT_COMPANY_PROFILE.brand_colors when enabled but user colors are empty array", () => {
    expect(resolveBrandColors([], true)).toEqual(DEFAULT_COMPANY_PROFILE.brand_colors);
  });

  it("falls back when enabled but user colors are undefined", () => {
    expect(resolveBrandColors(undefined, true)).toEqual(DEFAULT_COMPANY_PROFILE.brand_colors);
  });
});

describe("resolveBrandFont", () => {
  it("returns null when preview disabled", () => {
    expect(resolveBrandFont("Poppins", false)).toBeNull();
  });

  it("returns user's brand font when enabled and present", () => {
    expect(resolveBrandFont("Poppins", true)).toBe("Poppins");
  });

  it("returns null when enabled but user font is empty/null/undefined", () => {
    expect(resolveBrandFont("", true)).toBeNull();
    expect(resolveBrandFont(null, true)).toBeNull();
    expect(resolveBrandFont(undefined, true)).toBeNull();
  });
});

describe("resolveLogoUrl", () => {
  it("returns null when preview disabled, regardless of user logo", () => {
    expect(resolveLogoUrl("/permanent/logos/u1/logo.png?v=1", false)).toBeNull();
    expect(resolveLogoUrl(null, false)).toBeNull();
  });

  it("returns user's logo when enabled and present", () => {
    expect(resolveLogoUrl("/permanent/logos/u1/logo.png?v=1", true)).toBe("/permanent/logos/u1/logo.png?v=1");
  });

  it("falls back to DEFAULT_COMPANY_PROFILE.logo_url when enabled but user has none", () => {
    expect(resolveLogoUrl(null, true)).toBe(DEFAULT_COMPANY_PROFILE.logo_url);
    expect(resolveLogoUrl(undefined, true)).toBe(DEFAULT_COMPANY_PROFILE.logo_url);
  });
});
