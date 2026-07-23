import { describe, it, expect } from "vitest";
import { corsSafeAssetUrl, resolveAssetUrl } from "../assetUrl";

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

// ── Proxy CORS untuk canvas Fabric ────────────────────────────────────────────

describe("corsSafeAssetUrl", () => {
  it("mengarahkan path tersimpan ke proxy backend, bukan CDN", () => {
    const url = corsSafeAssetUrl("/permanent/uploads/u1/a.png");
    expect(url).toBe("http://localhost:8000/api/v1/assets/permanent/uploads/u1/a.png");
  });

  it("menulis ulang URL CDN yang sudah ter-resolve ke proxy", () => {
    const cdn = resolveAssetUrl("/permanent/uploads/u1/a.png")!;
    expect(corsSafeAssetUrl(cdn)).toBe(
      "http://localhost:8000/api/v1/assets/permanent/uploads/u1/a.png",
    );
  });

  it("membiarkan data URL apa adanya (upload lokal di editor)", () => {
    expect(corsSafeAssetUrl("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });

  it("membiarkan host pihak ketiga apa adanya", () => {
    expect(corsSafeAssetUrl("https://replicate.delivery/x.png")).toBe(
      "https://replicate.delivery/x.png",
    );
  });

  it("membuang query cache-busting saat menyusun key proxy", () => {
    expect(corsSafeAssetUrl("/permanent/logos/u1/logo.png?v=123")).toBe(
      "http://localhost:8000/api/v1/assets/permanent/logos/u1/logo.png?v=123",
    );
  });

  it("null → null", () => {
    expect(corsSafeAssetUrl(null)).toBeNull();
  });
});
