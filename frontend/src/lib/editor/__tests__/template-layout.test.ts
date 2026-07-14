import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildCanvasSpec, computeTextLayout } from "../canvas-spec";
import type { TextSpec } from "../canvas-spec";
import type { MeasureBlock } from "../fit-text";
import { mergeCopyIntoTemplate, type CopyResult } from "../merge";

// Template asli = fixture terbaik: bug di area ini selalu muncul dari geometri nyata.
const DIR = resolve(process.cwd(), "../backend/scripts/seed_template_data");

/**
 * Proksi Fabric yang jujur: bungkus greedy per kata (hormati \n) dan kembalikan
 * lebar BARIS TERLEBAR — bukan lebar total teks. Fabric.calcTextWidth() begitu.
 * Fake yang mengembalikan lebar total memaksa semua teks jadi satu baris.
 */
const measurerFor = (spec: { width: number }): MeasureBlock => (text, fontSize) => {
  const em = (s: string) => (s === s.toUpperCase() ? 0.62 : 0.55);
  const w = (s: string) => s.length * fontSize * em(text);
  let widest = 0;
  let lines = 0;
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { lines++; continue; }
    let line = words[0];
    for (const word of words.slice(1)) {
      const cand = `${line} ${word}`;
      if (w(cand) <= spec.width) line = cand;
      else { widest = Math.max(widest, w(line)); lines++; line = word; }
    }
    widest = Math.max(widest, w(line));
    lines++;
  }
  return { width: widest, lines: Math.max(1, lines) };
};

const cfgOf = (f: string) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf-8")).template_config;
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const specsOf = (cfg: unknown) =>
  buildCanvasSpec({ cfg: cfg as never, thumbnailUrl: "https://cdn/x.png", contact: {} }).specs;

const copy = (headline: string, body: string, cta: string): CopyResult => ({
  copy: { headline, body, cta },
  typography: { headline_font: "Poppins", headline_size: 0, body_font: "Poppins", body_size: 0, letter_spacing: 0 },
  image_prompt: "", image_source: "none", thematic_image_url: null,
});

describe("kompatibilitas mundur", () => {
  it("copy authored: TIDAK ADA elemen yang bergeser posisinya, di semua template", () => {
    const moved: string[] = [];
    for (const file of files) {
      const specs = specsOf(cfgOf(file));
      const layout = computeTextLayout(specs, measurerFor);
      for (const s of specs) {
        if (s.kind !== "text") continue;
        const t = s as TextSpec;
        if (layout.get(t.id)!.top !== t.top) moved.push(`${file} "${t.text.slice(0, 12)}"`);
      }
    }
    expect(moved).toEqual([]);
  });

  it("copy authored: fontSize hanya turun bila teks template MEMANG meluber budget-nya", () => {
    // Menyusut itu sah — tapi hanya untuk teks yang benar-benar tak muat di ruangnya
    // sendiri (template over-scaled). Selain itu, ukuran authored wajib utuh.
    for (const file of files) {
      const specs = specsOf(cfgOf(file));
      const layout = computeTextLayout(specs, measurerFor);
      for (const s of specs) {
        if (s.kind !== "text") continue;
        const t = s as TextSpec;
        if (layout.get(t.id)!.fontSize === t.fontSize) continue;

        const { lines } = measurerFor(t)(t.text, t.fontSize);
        const overflows = t.fitBottom !== undefined && lines * t.fontSize * t.lineHeight > t.fitBottom - t.top;
        expect(overflows, `${file} "${t.text.slice(0, 12)}" menyusut tanpa meluber`).toBe(true);
      }
    }
  });

  it("proyek lama (tanpa templateValue): reflow jadi no-op — posisi persis authored", () => {
    // Simulasi: config ter-merge tapi templateValue dihapus (data pra-fitur)
    const merged = mergeCopyIntoTemplate(
      copy("Pipa Anti Bocor?", "Pernah repot ganti pipa yang bocor? Pipa Kuat dari Didi Flower solusinya.", "Pelajari"),
      cfgOf("astari-dental-gigi-berlubang.json"),
      { fontSizeStrategy: "template" },
    ).template;
    const legacy = {
      ...merged,
      elements: merged.elements.map((el) => {
        const stripped = { ...el };
        delete stripped.templateValue;
        return stripped;
      }),
    };

    const layout = computeTextLayout(specsOf(legacy), measurerFor);
    for (const s of specsOf(legacy)) {
      if (s.kind !== "text") continue;
      const t = s as TextSpec;
      // top tak pernah naik: tanpa templateValue, tinggi authored == tinggi aktual
      expect(layout.get(t.id)!.top).toBe(t.top);
    }
  });

  it("regresi: body tidak pernah ditarik masuk ke dalam headline (gap desain negatif)", () => {
    const merged = mergeCopyIntoTemplate(
      copy("Pipa Anti Bocor?", "Pernah repot ganti pipa yang bocor? Pipa Kuat dari Didi Flower solusinya. Kuat, tahan lama, anti rembes.", "Pelajari Selengkapnya"),
      cfgOf("astari-dental-gigi-berlubang.json"),
      { fontSizeStrategy: "template" },
    ).template;

    const specs = specsOf(merged);
    const layout = computeTextLayout(specs, measurerFor);
    const texts = specs.filter((s): s is TextSpec => s.kind === "text").sort((a, b) => a.top - b.top);

    const rows = texts.map((t) => {
      const l = layout.get(t.id)!;
      const lines = measurerFor(t)(t.text, l.fontSize).lines;
      return { top: l.top, bottom: l.top + lines * l.fontSize * t.lineHeight };
    });

    // tiap blok mulai setelah blok sebelumnya berakhir (tak ada tumpang tindih)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].top).toBeGreaterThanOrEqual(rows[i - 1].bottom);
    }
  });
});
