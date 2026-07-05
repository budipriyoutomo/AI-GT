import { describe, it, expect } from "vitest";
import { buildCanvasSpec } from "../canvas-spec";
import type {
  CanvasSpec,
  FooterSpec,
  GroupSpec,
  ImageSpec,
  RectSpec,
  TextSpec,
} from "../canvas-spec";
import type { TemplateConfig, TemplateElement } from "@/types/template";

// ── Seed helpers ──────────────────────────────────────────────────────────────

const CONTACT = { website: "www.toko.com", instagram: "@toko" };

function makeCfg(overrides: Partial<TemplateConfig> = {}): TemplateConfig {
  return {
    canvas: { aspect: "4:5", dimensions: { width: 1080, height: 1350 } },
    background: { type: "color", value: "#1A1A1A" },
    color_scheme: { accent: "#F2C200", primary: "#FFFFFF", secondary: "#2E6B34" },
    font: { family: "Montserrat" },
    elements: [],
    ...overrides,
  };
}

function build(cfg: TemplateConfig, extra: Partial<Parameters<typeof buildCanvasSpec>[0]> = {}) {
  return buildCanvasSpec({ cfg, thumbnailUrl: null, logoUrl: "https://cdn/logo.png", contact: CONTACT, ...extra });
}

function specOf<T extends CanvasSpec>(specs: CanvasSpec[], kind: T["kind"], nth = 0): T {
  const hits = specs.filter((s) => s.kind === kind);
  return hits[nth] as T;
}

// ── Dimensi canvas ────────────────────────────────────────────────────────────

describe("buildCanvasSpec — dimensi", () => {
  it("memakai canvas.dimensions bila ada", () => {
    const out = build(makeCfg());
    expect(out.width).toBe(1080);
    expect(out.height).toBe(1350);
  });

  it("fallback ke aspect bila dimensions tidak ada (1:1 → 1080×1080)", () => {
    const out = build(makeCfg({ canvas: { aspect: "1:1" } }));
    expect(out.width).toBe(1080);
    expect(out.height).toBe(1080);
  });

  it("default 4:5 bila canvas tidak ada", () => {
    const out = build(makeCfg({ canvas: undefined }));
    expect(out.width).toBe(1080);
    expect(out.height).toBe(1350);
  });
});

// ── Background ────────────────────────────────────────────────────────────────

describe("buildCanvasSpec — background", () => {
  it("warna solid → rect full-canvas", () => {
    const out = build(makeCfg());
    const bg = specOf<RectSpec>(out.specs, "rect");
    expect(bg).toMatchObject({ left: 0, top: 0, width: 1080, height: 1350, fill: "#1A1A1A" });
  });

  it("gradient 'to bottom' → rect dengan stops vertikal", () => {
    const out = build(makeCfg({
      background: { type: "gradient", direction: "to bottom", stops: ["#4EA482", "#4EA482", "#E8DBB0"] },
    }));
    const bg = specOf<RectSpec>(out.specs, "rect");
    expect(bg.gradient).toMatchObject({
      coords: { x1: 0, y1: 0, x2: 0, y2: 1350 },
      stops: [
        { offset: 0, color: "#4EA482" },
        { offset: 0.5, color: "#4EA482" },
        { offset: 1, color: "#E8DBB0" },
      ],
    });
  });

  it("background image → fallback rect + image cover full-canvas", () => {
    const out = build(
      makeCfg({ background: { type: "image", fallback: "#0B1420" } }),
      { thumbnailUrl: "https://cdn/bg.png" },
    );
    const bg = specOf<RectSpec>(out.specs, "rect");
    expect(bg.fill).toBe("#0B1420");
    const img = specOf<ImageSpec>(out.specs, "image");
    expect(img).toMatchObject({ url: "https://cdn/bg.png", left: 0, top: 0, width: 1080, height: 1350, fit: "cover" });
  });

  it("background image tanpa thumbnailUrl → hanya fallback rect", () => {
    const out = build(makeCfg({ background: { type: "image", fallback: "#0B1420" } }));
    expect(out.specs.filter((s) => s.kind === "image")).toHaveLength(0);
  });
});

// ── Elemen ────────────────────────────────────────────────────────────────────

describe("buildCanvasSpec — elemen", () => {
  it("text: posisi fraksional → px, role color di-resolve, default weight/align/lineHeight", () => {
    const el: TemplateElement = {
      type: "text", x: 0.1, y: 0.2, width: 0.8,
      value: "Halo", style: { fontSize: 90, color: "primary" },
    };
    const out = build(makeCfg({ elements: [el] }));
    const t = specOf<TextSpec>(out.specs, "text");
    expect(t).toMatchObject({
      text: "Halo",
      left: 108, top: 270, width: 864,
      fontSize: 90, fill: "#FFFFFF",
      fontWeight: "400", textAlign: "left", lineHeight: 1.1,
      fontFamily: "Montserrat",
    });
  });

  it("text: letterSpacing px → charSpacing (1/1000 em)", () => {
    const el: TemplateElement = {
      type: "text", x: 0, y: 0, width: 1,
      value: "KICKER", style: { fontSize: 32, letterSpacing: 6, color: "#FFF" },
    };
    const out = build(makeCfg({ elements: [el] }));
    expect(specOf<TextSpec>(out.specs, "text").charSpacing).toBeCloseTo(187.5);
  });

  it("text: accentWords → range karakter dengan warna/weight accent", () => {
    const el: TemplateElement = {
      type: "text", x: 0, y: 0, width: 1,
      value: "90% pebisnis ngeluh soal hal yang sama",
      style: { fontSize: 34, color: "secondary", accentWords: "90% pebisnis", accentColor: "primary", accentWeight: "700" },
    };
    const out = build(makeCfg({ elements: [el] }));
    expect(specOf<TextSpec>(out.specs, "text").accent).toEqual({
      start: 0, end: 12, fill: "#FFFFFF", fontWeight: "700",
    });
  });

  it("text: accentWords tidak ditemukan di value → tanpa accent", () => {
    const el: TemplateElement = {
      type: "text", x: 0, y: 0, width: 1,
      value: "Teks baru", style: { fontSize: 34, accentWords: "tidak ada" },
    };
    const out = build(makeCfg({ elements: [el] }));
    expect(specOf<TextSpec>(out.specs, "text").accent).toBeUndefined();
  });

  it("text: fillGradient, stroke, dan shadow CSS di-parse", () => {
    const el: TemplateElement = {
      type: "text", x: 0, y: 0, width: 1,
      value: "TEBUS",
      style: {
        fontSize: 142,
        fillGradient: ["#FFF3A8", "#FFCB1F"],
        stroke: { color: "secondary", width: 4 },
        shadow: "0 4px 12px rgba(0,0,0,0.35)",
      },
    };
    const out = build(makeCfg({ elements: [el] }));
    const t = specOf<TextSpec>(out.specs, "text");
    expect(t.fillGradient).toEqual(["#FFF3A8", "#FFCB1F"]);
    expect(t.stroke).toEqual({ color: "#2E6B34", width: 4 });
    expect(t.shadow).toEqual({ offsetX: 0, offsetY: 4, blur: 12, color: "rgba(0,0,0,0.35)" });
  });

  it("scrim: gradient rgba dengan offset dari position", () => {
    const el: TemplateElement = {
      type: "scrim", x: 0, y: 0, width: 1, height: 1,
      gradient: {
        direction: "to bottom",
        stops: [
          { color: "#0B1420", alpha: 0, position: 25 },
          { color: "#0B1420", alpha: 0.92, position: 100 },
        ],
      },
    };
    const out = build(makeCfg({ elements: [el] }));
    const scrim = specOf<RectSpec>(out.specs, "rect", 1); // [0] = background
    expect(scrim.gradient?.stops).toEqual([
      { offset: 0.25, color: "rgba(11, 20, 32, 0)" },
      { offset: 1, color: "rgba(11, 20, 32, 0.92)" },
    ]);
  });

  it("logo → image spec dengan logoUrl dan fit contain", () => {
    const el: TemplateElement = { type: "logo", source: "brand", x: 0.38, y: 0.04, width: 0.24, height: 0.1 };
    const out = build(makeCfg({ elements: [el] }));
    const img = specOf<ImageSpec>(out.specs, "image");
    expect(img).toMatchObject({
      url: "https://cdn/logo.png",
      left: 0.38 * 1080, top: 0.04 * 1350, width: 0.24 * 1080, height: 0.1 * 1350,
      fit: "contain",
    });
  });

  it("image thumbnail → image spec; tanpa thumbnailUrl → dilewati", () => {
    const el: TemplateElement = { type: "image", source: "thumbnail", x: 0.11, y: 0.51, width: 0.78, height: 0.3, fit: "contain" };

    const withThumb = build(makeCfg({ elements: [el] }), { thumbnailUrl: "https://cdn/dish.png" });
    expect(specOf<ImageSpec>(withThumb.specs, "image")).toMatchObject({ url: "https://cdn/dish.png", fit: "contain" });

    const noThumb = build(makeCfg({ elements: [el] }));
    expect(noThumb.specs.filter((s) => s.kind === "image")).toHaveLength(0);
  });

  it("group: anchor & gap px, children membawa left/width group", () => {
    const el: TemplateElement = {
      type: "group", x: 0.06, y: 0.9, width: 0.86, anchor: "bottom", gap: 22,
      children: [
        { type: "text", x: 0, y: 0, width: 1, value: "Headline", style: { fontSize: 90, color: "primary" } },
        { type: "text", x: 0, y: 0, width: 1, value: "Body", style: { fontSize: 34, color: "secondary" } },
      ],
    };
    const out = build(makeCfg({ elements: [el] }));
    const g = specOf<GroupSpec>(out.specs, "group");
    expect(g).toMatchObject({ anchor: "bottom", y: 0.9 * 1350, gap: 22, left: 0.06 * 1080, width: 0.86 * 1080 });
    expect(g.children).toHaveLength(2);
    expect(g.children[0]).toMatchObject({ text: "Headline", left: 0.06 * 1080, width: 0.86 * 1080, fill: "#FFFFFF" });
  });

  it("footer: slot di-resolve dari contact, slot tanpa nilai dilewati", () => {
    const el: TemplateElement = {
      type: "footer", x: 0.04, y: 0.93, width: 0.92, height: 0.05,
      slots: ["website", "instagram", "hashtag"],
      style: { color: "primary", backgroundColor: "transparent", opacity: 1, fontSize: 20 },
    };
    const out = build(makeCfg({ elements: [el] }));
    const f = specOf<FooterSpec>(out.specs, "footer");
    expect(f).toMatchObject({
      left: 0.04 * 1080, top: 0.93 * 1350, width: 0.92 * 1080, height: 0.05 * 1350,
      backgroundColor: "transparent", opacity: 1, color: "#FFFFFF", fontSize: 20,
    });
    expect(f.items).toEqual(["www.toko.com", "@toko"]);
  });
});
