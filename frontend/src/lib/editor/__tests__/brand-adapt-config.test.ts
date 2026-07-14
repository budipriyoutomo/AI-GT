import { describe, it, expect } from "vitest";
import { brandAdaptConfig } from "../brand-adapt-config";
import type { TemplateConfig } from "@/types/template";

function cfg(overrides: Partial<TemplateConfig> = {}): TemplateConfig {
  return {
    canvas: { aspect: "4:5" },
    background: { type: "color", value: "#1A1A1A" },
    color_scheme: { accent: "#F2C200", primary: "#FFFFFF", secondary: "#2E6B34" },
    font: { family: "Montserrat" },
    elements: [],
    ...overrides,
  };
}

describe("brandAdaptConfig", () => {
  it("brand kosong → cfg dikembalikan apa adanya (identitas)", () => {
    const c = cfg();
    expect(brandAdaptConfig(c, null)).toBe(c);
    expect(brandAdaptConfig(c, [])).toBe(c);
  });

  it("brand terisi → role kromatik di color_scheme diganti (netral putih dipertahankan)", () => {
    const out = brandAdaptConfig(cfg(), ["#0055FF"]);
    // accent kromatik → berubah; primary putih (netral/struktural) → tetap
    expect(out.color_scheme!.accent).not.toBe("#F2C200");
    expect(out.color_scheme!.primary).toBe("#FFFFFF");
  });

  it("tidak memutasi cfg asli (read-only terhadap template_config)", () => {
    const c = cfg();
    const before = JSON.parse(JSON.stringify(c));
    brandAdaptConfig(c, ["#0055FF"]);
    expect(c).toEqual(before);
  });

  it("brand_font diterapkan hanya ke role di font_brand_roles", () => {
    const c = cfg({
      brand_theme: { font_brand_roles: ["body"] },
      elements: [
        { type: "text", role: "headline", x: 0, y: 0, width: 1, value: "H", style: { fontFamily: "Anton" } },
        { type: "text", role: "body", x: 0, y: 0.5, width: 1, value: "B", style: { fontFamily: "Anton" } },
      ],
    });
    const out = brandAdaptConfig(c, ["#0055FF"], "Lora");
    expect(out.elements![0].style!.fontFamily).toBe("Anton"); // headline tak di-whitelist
    expect(out.elements![1].style!.fontFamily).toBe("Lora");  // body di-whitelist
  });
});
