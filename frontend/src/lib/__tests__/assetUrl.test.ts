import { describe, it, expect } from "vitest";
import { resolveAssetUrl } from "../assetUrl";

describe("resolveAssetUrl", () => {
  it("preserves a query string (cache-busting ?v=) when prepending the CDN base", () => {
    const result = resolveAssetUrl("/permanent/logos/u1/logo.png?v=1752345600");
    expect(result).toBe("https://cdn.calira.my.id/permanent/logos/u1/logo.png?v=1752345600");
  });

  it("returns null for null/undefined", () => {
    expect(resolveAssetUrl(null)).toBeNull();
    expect(resolveAssetUrl(undefined)).toBeNull();
  });

  it("returns already-absolute URLs unchanged", () => {
    expect(resolveAssetUrl("https://example.com/x.png?v=1")).toBe("https://example.com/x.png?v=1");
  });
});
