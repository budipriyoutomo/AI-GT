import { describe, it, expect } from "vitest";
import { parseBrandPreview } from "../brand-preview";

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
