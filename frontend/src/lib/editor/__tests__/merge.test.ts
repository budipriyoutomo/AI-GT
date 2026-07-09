import { describe, it, expect } from "vitest";
import { mergeCopyIntoTemplate } from "../merge";
import type { CopyResult } from "../merge";
import type { TemplateConfig } from "@/types/template";

// ── Seed helpers ──────────────────────────────────────────────────────────────

function makeCopy(copyOverrides: Partial<CopyResult["copy"]> = {}): CopyResult {
  return {
    copy: {
      headline: "Kopi Gula Aren Premium",
      body: "Nikmati cita rasa kopi gula aren terbaik pilihan pebisnis",
      cta: "Pesan Sekarang",
      ...copyOverrides,
    },
    typography: {
      headline_font: "Playfair Display",
      headline_size: 36,
      body_font: "Lato",
      body_size: 16,
      letter_spacing: 0.5,
    },
    image_prompt: "kopi gula aren premium product photography",
    image_source: "none",
    thematic_image_url: null,
  };
}

// Template seed: scrim + logo + group(headline, body) + footer
// body punya accentWords placeholder; template tidak punya slot CTA
function makeTemplate(): TemplateConfig {
  return {
    color_scheme: { accent: "#FF6B35", primary: "#FFFFFF", secondary: "#1A1A1A" },
    font: { family: "Inter" },
    background: { type: "color", value: "#1A1A1A" },
    brand_theme: { mode: "tint", color_slots: {}, font_brand_roles: [] },
    elements: [
      {
        type: "scrim",
        x: 0,
        y: 0,
        width: 1080,
        height: 1080,
        gradient: {
          direction: "180deg",
          stops: [{ color: "#000000", alpha: 0.8, position: 0 }],
        },
      },
      {
        type: "logo",
        x: 40,
        y: 40,
        width: 120,
        height: 120,
        source: "brand",
      },
      {
        type: "group",
        x: 40,
        y: 400,
        width: 1000,
        anchor: "top",
        gap: 24,
        children: [
          {
            type: "text",
            x: 0,
            y: 0,
            width: 1000,
            bind: "headline",
            role: "headline",
            value: "Headline Placeholder",
            style: { fontSize: 90, color: "primary", weight: "700" },
          },
          {
            type: "text",
            x: 0,
            y: 0,
            width: 1000,
            bind: "body",
            role: "body",
            value: "Body placeholder tentang 50% pebisnis UMKM Indonesia",
            style: {
              fontSize: 34,
              color: "secondary",
              accentWords: "50% pebisnis UMKM Indonesia",
              accentColor: "accent",
              accentWeight: "700",
            },
          },
        ],
      },
      {
        type: "footer",
        x: 0,
        y: 960,
        width: 1080,
        height: 120,
        slots: ["tagline", "logo"],
      },
    ],
  };
}

// ── Helpers untuk navigasi elemen output ─────────────────────────────────────

function findHeadline(template: TemplateConfig) {
  const group = template.elements.find((e) => e.type === "group");
  return group?.children?.find((e) => e.bind === "headline");
}

function findBody(template: TemplateConfig) {
  const group = template.elements.find((e) => e.type === "group");
  return group?.children?.find((e) => e.bind === "body");
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe("mergeCopyIntoTemplate", () => {
  // ── Binding teks ────────────────────────────────────────────────────────────

  describe("binding teks", () => {
    it("mengisi value element dari copy[bind] yang sesuai (headline & body)", () => {
      const result = makeCopy();
      const { template: out, warnings } = mergeCopyIntoTemplate(result, makeTemplate());

      expect(findHeadline(out)?.value).toBe("Kopi Gula Aren Premium");
      expect(findBody(out)?.value).toBe(
        "Nikmati cita rasa kopi gula aren terbaik pilihan pebisnis",
      );
      expect(warnings.some((w) => w.code === "empty-bound-copy")).toBe(false);
    });

    it("copy[bind] kosong → placeholder dipertahankan + warning empty-bound-copy", () => {
      const result = makeCopy({ headline: "" });
      const { template: out, warnings } = mergeCopyIntoTemplate(result, makeTemplate());

      expect(findHeadline(out)?.value).toBe("Headline Placeholder");
      expect(
        warnings.some((w) => w.code === "empty-bound-copy" && w.field === "headline"),
      ).toBe(true);
    });
  });

  // ── Orphan copy ─────────────────────────────────────────────────────────────

  describe("orphan copy", () => {
    it("copy.cta tanpa element bind → warning orphan-copy-field, tidak ada element baru ditambahkan", () => {
      const template = makeTemplate();
      const elementCountBefore = template.elements.length;
      const { template: out, warnings } = mergeCopyIntoTemplate(makeCopy(), template);

      expect(
        warnings.some((w) => w.code === "orphan-copy-field" && w.field === "cta"),
      ).toBe(true);
      expect(out.elements.length).toBe(elementCountBefore);
    });
  });

  // ── Tipografi ────────────────────────────────────────────────────────────────

  describe("tipografi", () => {
    it("font family per role diterapkan: headline → Playfair Display, body → Lato", () => {
      const { template: out } = mergeCopyIntoTemplate(makeCopy(), makeTemplate());

      expect(findHeadline(out)?.style?.fontFamily).toBe("Playfair Display");
      expect(findBody(out)?.style?.fontFamily).toBe("Lato");
    });

    it("letterSpacing diterapkan ke semua text element", () => {
      const { template: out } = mergeCopyIntoTemplate(makeCopy(), makeTemplate());

      expect(findHeadline(out)?.style?.letterSpacing).toBe(0.5);
      expect(findBody(out)?.style?.letterSpacing).toBe(0.5);
    });

    it("strategy default 'template': fontSize dipertahankan (90 / 34) + warning font-size-ignored", () => {
      const { template: out, warnings } = mergeCopyIntoTemplate(makeCopy(), makeTemplate());

      expect(findHeadline(out)?.style?.fontSize).toBe(90);
      expect(findBody(out)?.style?.fontSize).toBe(34);
      expect(warnings.some((w) => w.code === "font-size-ignored")).toBe(true);
    });

    it("strategy 'ai': fontSize dari AI (36 / 16)", () => {
      const { template: out } = mergeCopyIntoTemplate(makeCopy(), makeTemplate(), {
        fontSizeStrategy: "ai",
      });

      expect(findHeadline(out)?.style?.fontSize).toBe(36);
      expect(findBody(out)?.style?.fontSize).toBe(16);
    });

    it("strategy 'ai-scaled' + scale 2.5: headline 36 → 90", () => {
      const { template: out } = mergeCopyIntoTemplate(makeCopy(), makeTemplate(), {
        fontSizeStrategy: "ai-scaled",
        fontSizeScale: 2.5,
      });

      expect(findHeadline(out)?.style?.fontSize).toBe(90);
    });
  });

  // ── Reconcile accentWords ────────────────────────────────────────────────────

  describe("reconcile accentWords", () => {
    it("frasa lama tidak ada di teks baru → hapus accentWords/accentColor/accentWeight + warning stale-accent-words", () => {
      // copy.body tidak mengandung "50% pebisnis UMKM Indonesia"
      const { template: out, warnings } = mergeCopyIntoTemplate(makeCopy(), makeTemplate());

      const body = findBody(out);
      expect(body?.style?.accentWords).toBeUndefined();
      expect(body?.style?.accentColor).toBeUndefined();
      expect(body?.style?.accentWeight).toBeUndefined();
      expect(
        warnings.some((w) => w.code === "stale-accent-words" && w.field === "body"),
      ).toBe(true);
    });

    it("frasa lama masih ada di teks baru → accentWords dipertahankan", () => {
      const accentPhrase = "50% pebisnis UMKM Indonesia";
      const result = makeCopy({
        body: `Lebih dari ${accentPhrase} sudah memilih produk kopi ini`,
      });
      const { template: out, warnings } = mergeCopyIntoTemplate(result, makeTemplate());

      expect(findBody(out)?.style?.accentWords).toBe(accentPhrase);
      expect(warnings.some((w) => w.code === "stale-accent-words")).toBe(false);
    });
  });

  // ── Template Integrity ───────────────────────────────────────────────────────

  describe("template integrity", () => {
    it("background, color_scheme, scrim, dan posisi/gap/anchor grup identik sebelum-sesudah", () => {
      const template = makeTemplate();
      const { template: out } = mergeCopyIntoTemplate(makeCopy(), template);

      expect(out.background).toEqual(template.background);
      expect(out.color_scheme).toEqual(template.color_scheme);

      const scrimIn = template.elements.find((e) => e.type === "scrim");
      const scrimOut = out.elements.find((e) => e.type === "scrim");
      expect(scrimOut).toEqual(scrimIn);

      const groupIn = template.elements.find((e) => e.type === "group");
      const groupOut = out.elements.find((e) => e.type === "group");
      expect(groupOut?.x).toBe(groupIn?.x);
      expect(groupOut?.y).toBe(groupIn?.y);
      expect(groupOut?.gap).toBe(groupIn?.gap);
      expect(groupOut?.anchor).toBe(groupIn?.anchor);
      expect(groupOut?.width).toBe(groupIn?.width);
    });

    it("input asli tidak dimutasi (pure function)", () => {
      const result = makeCopy();
      const template = makeTemplate();
      const snapshot = JSON.stringify(template);

      mergeCopyIntoTemplate(result, template);

      expect(JSON.stringify(template)).toBe(snapshot);
    });
  });
});

// ── templateValue (dipakai auto-fit untuk tahu tinggi ideal desainer) ─────────

describe("mergeCopyIntoTemplate — templateValue", () => {
  const cfg = (): TemplateConfig => ({
    canvas: { aspect: "4:5", dimensions: { width: 1080, height: 1350 } },
    color_scheme: { accent: "#000", primary: "#fff", secondary: "#888" },
    elements: [
      { type: "text", role: "headline", bind: "headline", x: 0, y: 0.1, width: 1, value: "GIGI BERLUBANG", style: { fontSize: 118 } },
      { type: "text", role: "kicker", x: 0, y: 0.05, width: 1, value: "Statis", style: { fontSize: 20 } },
    ],
  });

  const copy = (headline: string): CopyResult => ({
    copy: { headline, body: "b", cta: "c" },
    typography: { headline_font: "Poppins", headline_size: 0, body_font: "Inter", body_size: 0, letter_spacing: 0 },
    image_prompt: "", image_source: "none", thematic_image_url: null,
  });

  it("teks bound: value diganti copy AI, templateValue menyimpan teks asli template", () => {
    const { template } = mergeCopyIntoTemplate(copy("Kenapa Pipa Bisa Bocor?"), cfg(), { fontSizeStrategy: "template" });
    const headline = template.elements[0];
    expect(headline.value).toBe("Kenapa Pipa Bisa Bocor?");
    expect(headline.templateValue).toBe("GIGI BERLUBANG");
  });

  it("teks statis (tanpa bind): tidak diberi templateValue", () => {
    const { template } = mergeCopyIntoTemplate(copy("X"), cfg(), { fontSizeStrategy: "template" });
    expect(template.elements[1].templateValue).toBeUndefined();
  });

  it("copy kosong → value tetap placeholder, tanpa templateValue palsu", () => {
    const empty = { ...copy(""), copy: { headline: "", body: "", cta: "" } };
    const { template } = mergeCopyIntoTemplate(empty, cfg(), { fontSizeStrategy: "template" });
    expect(template.elements[0].value).toBe("GIGI BERLUBANG");
    expect(template.elements[0].templateValue).toBeUndefined();
  });
});
