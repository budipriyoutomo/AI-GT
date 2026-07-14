import { describe, it, expect } from "vitest";
import { resolveTemplateConfig } from "../resolve";
import type { BrandSource } from "../resolve";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";
import type { CopyResult } from "@/lib/editor/merge";
import type { TemplateConfig } from "@/types/template";

// ── Seed helpers ──────────────────────────────────────────────────────────────

function makeTemplate(): TemplateConfig {
  return {
    canvas: { aspect: "4:5", dimensions: { width: 1080, height: 1350 } },
    background: { type: "color", value: "#1A1A1A" },
    color_scheme: { accent: "#F2C200", primary: "#FFFFFF", secondary: "#2E6B34" },
    font: { family: "Inter" },
    brand_theme: {
      mode: "tint",
      color_slots: { accent: 0 },
      font_brand_roles: ["body"],
    },
    elements: [
      {
        type: "text",
        role: "eyebrow",
        x: 0.1, y: 0.1, width: 0.8,
        value: "• EYEBROW ASLI •",
        style: { fontSize: 24, color: "primary", letterSpacing: 6 },
      },
      {
        type: "text",
        role: "headline",
        bind: "headline",
        x: 0.1, y: 0.2, width: 0.8,
        value: "Headline placeholder",
        style: { fontSize: 90, color: "accent" },
      },
      {
        type: "text",
        role: "body",
        bind: "body",
        x: 0.1, y: 0.5, width: 0.8,
        value: "Body placeholder",
        style: { fontSize: 32, color: "secondary" },
      },
      {
        type: "logo",
        x: 0.35, y: 0.03, width: 0.3, height: 0.1,
      },
      {
        type: "scrim",
        x: 0, y: 0, width: 1, height: 1,
        gradient: {
          direction: "to bottom",
          stops: [
            { color: "#000000", alpha: 0.8, position: 0 },
            { color: "#000000", alpha: 0, position: 60 },
          ],
        },
      },
      {
        type: "group",
        x: 0.1, y: 0.9, width: 0.8,
        anchor: "bottom",
        gap: 16,
        children: [
          {
            type: "text",
            role: "cta",
            bind: "cta",
            x: 0, y: 0, width: 0.8,
            value: "CTA placeholder",
            style: { fontSize: 28, color: "accent" },
          },
        ],
      },
    ],
  };
}

function makeCopy(overrides: Partial<CopyResult> = {}): CopyResult {
  return {
    copy: { headline: "Diskon Gede", body: "Nikmati promo spesial hari ini", cta: "Beli Sekarang" },
    typography: {
      headline_font: "AI Headline Font",
      headline_size: 40,
      body_font: "AI Body Font",
      body_size: 20,
      letter_spacing: 5,
    },
    image_prompt: "",
    image_source: "none",
    thematic_image_url: null,
    ...overrides,
  };
}

const PROFILE: BrandSource = {
  logo_url: "/permanent/logos/u1/logo.png",
  brand_colors: ["#0033CC"],
  brand_font: "Poppins",
  tagline: "Rasa juara tiap gigitan",
};

function findByBind(elements: ReturnType<typeof resolveTemplateConfig>["elements"], bind: string) {
  const walk = (els: typeof elements): typeof elements[number] | undefined => {
    for (const el of els) {
      if (el.bind === bind) return el;
      if (el.children) {
        const hit = walk(el.children);
        if (hit) return hit;
      }
    }
    return undefined;
  };
  return walk(elements);
}

function findByRole(elements: ReturnType<typeof resolveTemplateConfig>["elements"], role: string) {
  const walk = (els: typeof elements): typeof elements[number] | undefined => {
    for (const el of els) {
      if (el.role === role) return el;
      if (el.children) {
        const hit = walk(el.children);
        if (hit) return hit;
      }
    }
    return undefined;
  };
  return walk(elements);
}

// ── Color adaptation ─────────────────────────────────────────────────────────

describe("resolveTemplateConfig — color", () => {
  it("branded=true + brand_colors → color_scheme adapted per brand_theme (tint)", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: PROFILE,
      branded: true,
    });
    // tint mode: color_slots.accent -> brand[0]; primary/secondary locked
    expect(out.color_scheme.accent).not.toBe("#F2C200");
    expect(out.color_scheme.primary).toBe("#FFFFFF");
    expect(out.color_scheme.secondary).toBe("#2E6B34");
  });

  it("branded=false → warna & font asli template; logo = DEFAULT_COMPANY_PROFILE.logo_url", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: PROFILE,
      branded: false,
    });
    expect(out.color_scheme).toEqual({ accent: "#F2C200", primary: "#FFFFFF", secondary: "#2E6B34" });
    expect(out.background).toEqual({ type: "color", value: "#1A1A1A" });
    expect(out.logoUrl).toBe(DEFAULT_COMPANY_PROFILE.logo_url);
  });
});

// ── Logo ──────────────────────────────────────────────────────────────────────

describe("resolveTemplateConfig — logo", () => {
  it("branded=true, logo_url=null → slot logo hidden (null), tidak reflow", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: { ...PROFILE, logo_url: null },
      branded: true,
    });
    expect(out.logoUrl).toBeNull();
    // element list is untouched — logo element still present, renderer decides visibility from logoUrl
    expect(out.elements.some((el) => el.type === "logo")).toBe(true);
  });

  it("branded=true, logo_url set → resolved logoUrl = profile logo (di-resolve ke URL CDN absolut)", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: PROFILE,
      branded: true,
    });
    expect(out.logoUrl).toBe("https://cdn.calira.my.id/permanent/logos/u1/logo.png");
  });
});

// ── Copy ──────────────────────────────────────────────────────────────────────

describe("resolveTemplateConfig — copy", () => {
  it("copy=undefined (pre-generate) → slot copy tetap placeholder template, tidak crash", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: PROFILE,
      branded: true,
    });
    expect(findByBind(out.elements, "headline")?.value).toBe("Headline placeholder");
    expect(findByBind(out.elements, "body")?.value).toBe("Body placeholder");
    expect(findByBind(out.elements, "cta")?.value).toBe("CTA placeholder");
  });

  it("copy tersedia → slot copy terisi", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: PROFILE,
      branded: true,
      copy: makeCopy(),
    });
    expect(findByBind(out.elements, "headline")?.value).toBe("Diskon Gede");
    expect(findByBind(out.elements, "body")?.value).toBe("Nikmati promo spesial hari ini");
    expect(findByBind(out.elements, "cta")?.value).toBe("Beli Sekarang");
  });
});

// ── Font precedence (§3.3) ────────────────────────────────────────────────────

describe("resolveTemplateConfig — font precedence", () => {
  it("brand_font set + AI font set, branded=true → slot copy (role di font_brand_roles) pakai brand_font", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: PROFILE, // brand_font: "Poppins"; font_brand_roles: ["body"]
      branded: true,
      copy: makeCopy(),
    });
    expect(findByBind(out.elements, "body")?.style?.fontFamily).toBe("Poppins");
  });

  it("brand_font null + AI font set → slot copy pakai font AI", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: { ...PROFILE, brand_font: null },
      branded: true,
      copy: makeCopy(),
    });
    expect(findByBind(out.elements, "body")?.style?.fontFamily).toBe("AI Body Font");
  });

  it("branded=false + AI font set → slot copy pakai font AI (brand tidak ikut)", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: PROFILE, // brand_font set, but branded=false so it must not apply
      branded: false,
      copy: makeCopy(),
    });
    expect(findByBind(out.elements, "body")?.style?.fontFamily).toBe("AI Body Font");
  });

  it("keduanya null (brand_font kosong, tanpa copy) → font template", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: { ...PROFILE, brand_font: null },
      branded: true,
    });
    // no merge invoked (copy undefined) → element keeps its original (unset) fontFamily,
    // renderer falls back to template.font.family ("Inter")
    expect(findByBind(out.elements, "body")?.style?.fontFamily).toBeUndefined();
    expect(out.font?.family).toBe("Inter");
  });

  it("role tidak di font_brand_roles (headline) tidak pernah pakai brand_font", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: PROFILE,
      branded: true,
      copy: makeCopy(),
    });
    expect(findByBind(out.elements, "headline")?.style?.fontFamily).toBe("AI Headline Font");
  });
});

// ── Elemen statis (proteksi) ──────────────────────────────────────────────────

describe("resolveTemplateConfig — elemen statis dilindungi", () => {
  it.each([
    ["branded=true + brand_font + copy", { branded: true, profile: PROFILE, copy: makeCopy() }],
    ["branded=false + copy", { branded: false, profile: PROFILE, copy: makeCopy() }],
    ["branded=true, brand_font null + copy", { branded: true, profile: { ...PROFILE, brand_font: null }, copy: makeCopy() }],
    ["branded=true + brand_font, tanpa copy", { branded: true, profile: PROFILE }],
  ] as const)("letterSpacing eyebrow tetap 6 — %s", (_label, params) => {
    const out = resolveTemplateConfig({ templateConfig: makeTemplate(), ...params });
    expect(findByRole(out.elements, "eyebrow")?.style?.letterSpacing).toBe(6);
  });

  it("eyebrow tidak pernah memakai brand_font (role tidak di font_brand_roles)", () => {
    const out = resolveTemplateConfig({
      templateConfig: makeTemplate(),
      profile: PROFILE,
      branded: true,
      copy: makeCopy(),
    });
    expect(findByRole(out.elements, "eyebrow")?.style?.fontFamily).not.toBe("Poppins");
    expect(findByRole(out.elements, "eyebrow")?.style?.fontFamily).not.toBe("AI Headline Font");
  });
});

// ── Scrim ─────────────────────────────────────────────────────────────────────

describe("resolveTemplateConfig — scrim", () => {
  it("scrim gradient sudah teradaptasi (bukan tugas renderer lagi)", () => {
    const branded = resolveTemplateConfig({ templateConfig: makeTemplate(), profile: PROFILE, branded: true });
    const unbranded = resolveTemplateConfig({ templateConfig: makeTemplate(), profile: PROFILE, branded: false });
    const scrimBranded = branded.elements.find((el) => el.type === "scrim");
    const scrimUnbranded = unbranded.elements.find((el) => el.type === "scrim");
    expect(scrimBranded?.gradient).toBeDefined();
    expect(scrimUnbranded?.gradient).toBeDefined();
    // mode tint tanpa opt-in `scrim: true` di brand_theme → LOCKED, identik antara branded/unbranded
    expect(scrimBranded?.gradient).toEqual(scrimUnbranded?.gradient);
  });
});

// ── Fungsi murni ──────────────────────────────────────────────────────────────

describe("resolveTemplateConfig — kemurnian", () => {
  it("input identik → output identik", () => {
    const tpl = makeTemplate();
    const out1 = resolveTemplateConfig({ templateConfig: tpl, profile: PROFILE, branded: true, copy: makeCopy() });
    const out2 = resolveTemplateConfig({ templateConfig: tpl, profile: PROFILE, branded: true, copy: makeCopy() });
    expect(out1).toEqual(out2);
  });

  it("tidak memodifikasi input (template/profile/copy)", () => {
    const tpl = makeTemplate();
    const tplSnapshot = JSON.parse(JSON.stringify(tpl));
    const profile = { ...PROFILE };
    const profileSnapshot = JSON.parse(JSON.stringify(profile));
    const copy = makeCopy();
    const copySnapshot = JSON.parse(JSON.stringify(copy));

    resolveTemplateConfig({ templateConfig: tpl, profile, branded: true, copy });

    expect(tpl).toEqual(tplSnapshot);
    expect(profile).toEqual(profileSnapshot);
    expect(copy).toEqual(copySnapshot);
  });
});
