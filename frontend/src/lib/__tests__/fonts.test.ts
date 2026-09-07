import { describe, expect, it } from "vitest";

import {
  BRAND_FONT_OPTIONS,
  FONT_CSS_VAR,
  TEMPLATE_DISPLAY_FONTS,
  normalizeFontFamily,
} from "../fonts";

describe("BRAND_FONT_OPTIONS", () => {
  it("satu sumber daftar font — dipakai Settings dan editor", () => {
    expect(BRAND_FONT_OPTIONS).toEqual([
      "Inter",
      "Poppins",
      "Montserrat",
      "Plus Jakarta Sans",
      "Nunito",
      "Lato",
      "Roboto",
      "Open Sans",
      "Playfair Display",
    ]);
  });

  it("tidak ada duplikat", () => {
    expect(new Set(BRAND_FONT_OPTIONS).size).toBe(BRAND_FONT_OPTIONS.length);
  });

  /**
   * Invarian utama: font yang bisa dipilih user WAJIB punya CSS variable, artinya
   * benar-benar dimuat next/font. Font tanpa var akan digambar Fabric dengan
   * fallback sans-serif — preview dan PNG export jadi bukan font yang dipilih.
   */
  it("setiap opsi punya CSS variable (benar-benar dimuat, bukan fallback)", () => {
    for (const family of BRAND_FONT_OPTIONS) {
      expect(FONT_CSS_VAR[family], `${family} tidak punya CSS var`).toMatch(/^--font-/);
    }
  });

  it("font display milik template juga punya CSS variable", () => {
    for (const family of TEMPLATE_DISPLAY_FONTS) {
      expect(FONT_CSS_VAR[family], `${family} tidak punya CSS var`).toMatch(/^--font-/);
    }
  });
});

describe("normalizeFontFamily", () => {
  it("id lama editor dipetakan ke nama family", () => {
    expect(normalizeFontFamily("syne")).toBe("Syne");
    expect(normalizeFontFamily("inter")).toBe("Inter");
    expect(normalizeFontFamily("georgia")).toBe("Georgia");
    expect(normalizeFontFamily("mono")).toBe("Space Mono");
  });

  it("nama family diteruskan apa adanya", () => {
    expect(normalizeFontFamily("Poppins")).toBe("Poppins");
    expect(normalizeFontFamily("Playfair Display")).toBe("Playfair Display");
  });

  it("nilai kosong → null (pemanggil pakai default template)", () => {
    expect(normalizeFontFamily("")).toBeNull();
    expect(normalizeFontFamily(null)).toBeNull();
    expect(normalizeFontFamily(undefined)).toBeNull();
  });
});
