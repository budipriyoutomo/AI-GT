import { describe, it, expect } from "vitest";
import { buildCanvasSpec, computeTextLayout, flowedTop, textBoxLayout } from "../canvas-spec";
import type { MeasureBlock } from "../fit-text";
import type {
  CanvasSpec,
  FooterSpec,
  GroupSpec,
  ImageSpec,
  RectSpec,
  TextSpec,
} from "../canvas-spec";
import type { TemplateElement } from "@/types/template";
import type { ResolvedConfig } from "@/lib/template/resolve";

// ── Seed helpers ──────────────────────────────────────────────────────────────

const CONTACT = { website: "www.toko.com", instagram: "@toko" };

function makeCfg(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    canvas: { aspect: "4:5", dimensions: { width: 1080, height: 1350 } },
    background: { type: "color", value: "#1A1A1A" },
    color_scheme: { accent: "#F2C200", primary: "#FFFFFF", secondary: "#2E6B34" },
    font: { family: "Montserrat" },
    elements: [],
    logoUrl: "https://cdn/logo.png",
    userImage: { url: null, slot: null, overlay: null },
    warnings: [],
    ...overrides,
  };
}

function build(
  cfg: ResolvedConfig,
  extra: Partial<Parameters<typeof buildCanvasSpec>[0]> & { logoUrl?: string | null } = {},
) {
  const { logoUrl, ...rest } = extra;
  const finalCfg = logoUrl !== undefined ? { ...cfg, logoUrl } : cfg;
  return buildCanvasSpec({ cfg: finalCfg, thumbnailUrl: null, contact: CONTACT, ...rest });
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

  it("text: stop fillGradient berupa role di-resolve ke hex (default vertikal)", () => {
    const el: TemplateElement = {
      type: "text", x: 0, y: 0, width: 1,
      value: "Cleared.", style: { fontSize: 104, fillGradient: ["primary", "accent"] },
    };
    const out = build(makeCfg({ elements: [el] }));
    const t = specOf<TextSpec>(out.specs, "text");
    expect(t.fillGradient).toEqual(["#FFFFFF", "#F2C200"]);
    expect(t.fillGradientCoords).toEqual({ x1: 0, y1: 0, x2: 0, y2: 1 });
  });

  it("text: fillGradientDirection 'to right' → coords horizontal ternormalisasi", () => {
    const el: TemplateElement = {
      type: "text", x: 0, y: 0, width: 1,
      value: "Cleared.",
      style: { fontSize: 104, fillGradient: ["primary", "accent"], fillGradientDirection: "to right" },
    };
    const out = build(makeCfg({ elements: [el] }));
    expect(specOf<TextSpec>(out.specs, "text").fillGradientCoords).toEqual({ x1: 0, y1: 0, x2: 1, y2: 0 });
  });

  it("text: style.background → box pill, padding em relatif fontSize, radius ikut skala", () => {
    const el: TemplateElement = {
      type: "text", x: 0, y: 0, width: 1,
      value: "Ayo beli",
      style: { fontSize: 28, color: "#FFFFFF", background: "accent", radius: 10, padding: "0.5em 1.4em" },
    };
    const out = build(makeCfg({ elements: [el] }));
    const box = specOf<TextSpec>(out.specs, "text").box!;
    // fontSize 28 (scale 1) → padY = 0.5em = 14px, padX = 1.4em = 39.2px
    expect(box).toMatchObject({ fill: "#F2C200", radius: 10, padY: 14 });
    expect(box.padX).toBeCloseTo(39.2);
  });

  it("text: tanpa style.background → tanpa box", () => {
    const el: TemplateElement = { type: "text", x: 0, y: 0, width: 1, value: "Ayo beli", style: { fontSize: 28 } };
    const out = build(makeCfg({ elements: [el] }));
    expect(specOf<TextSpec>(out.specs, "text").box).toBeUndefined();
  });

  it("text: rotate/skew/italic diteruskan ke spec (paritas transform TemplateRenderer)", () => {
    const el: TemplateElement = {
      type: "text", x: 0.1, y: 0.2, width: 0.8,
      value: "SALE", style: { fontSize: 220, rotate: -6, skew: -12, italic: true },
    };
    const out = build(makeCfg({ elements: [el] }));
    const t = specOf<TextSpec>(out.specs, "text");
    expect(t.angle).toBe(-6);
    expect(t.skewX).toBe(-12);
    expect(t.fontStyle).toBe("italic");
  });

  it("text: tanpa rotate/skew/italic → field transform undefined", () => {
    const el: TemplateElement = { type: "text", x: 0, y: 0, width: 1, value: "Halo", style: { fontSize: 40 } };
    const t = specOf<TextSpec>(build(makeCfg({ elements: [el] })).specs, "text");
    expect(t.angle).toBeUndefined();
    expect(t.skewX).toBeUndefined();
    expect(t.fontStyle).toBeUndefined();
  });

  it("text: rotate/skew/italic juga berlaku untuk anak group", () => {
    const el: TemplateElement = {
      type: "group", x: 0.06, y: 0.9, width: 0.86, anchor: "bottom", gap: 20,
      children: [
        { type: "text", x: 0, y: 0, width: 1, value: "Big", style: { fontSize: 90, rotate: -5, skew: -12, italic: true } },
      ],
    };
    const g = specOf<GroupSpec>(build(makeCfg({ elements: [el] })).specs, "group");
    expect(g.children[0]).toMatchObject({ angle: -5, skewX: -12, fontStyle: "italic" });
  });

  it("tagline: isi dari input.tagline, styling & posisi seperti text", () => {
    const el: TemplateElement = {
      type: "tagline", x: 0.1, y: 0.12, width: 0.5,
      value: "Placeholder", style: { fontSize: 30, color: "primary" },
    };
    const out = build(makeCfg({ elements: [el] }), { tagline: "Fast. Reliable. Secured" });
    const t = specOf<TextSpec>(out.specs, "text");
    expect(t).toMatchObject({
      text: "Fast. Reliable. Secured",
      templateText: "Fast. Reliable. Secured",
      left: 0.1 * 1080, top: 0.12 * 1350, width: 0.5 * 1080,
      fill: "#FFFFFF", fontSize: 30,
    });
    expect(t.bind).toBeUndefined();
  });

  it("tagline: tanpa input.tagline → fallback ke value template (placeholder)", () => {
    const el: TemplateElement = {
      type: "tagline", x: 0.1, y: 0.12, width: 0.5, value: "Placeholder Tagline", style: { fontSize: 30 },
    };
    const out = build(makeCfg({ elements: [el] })); // tagline default ""
    expect(specOf<TextSpec>(out.specs, "text").text).toBe("Placeholder Tagline");
  });

  it("rule: rect tipis dengan warna role, thickness & rotate", () => {
    const el: TemplateElement = {
      type: "rule", x: 0.6, y: 0.1, width: 0.34,
      style: { color: "accent", thickness: 3, rotate: 32 },
    };
    const out = build(makeCfg({ elements: [el] }));
    const rule = specOf<RectSpec>(out.specs, "rect", 1); // [0] = background
    expect(rule).toMatchObject({
      left: 0.6 * 1080, top: 0.1 * 1350, width: 0.34 * 1080, height: 3,
      fill: "#F2C200", angle: 32, radius: 2,
    });
  });

  it("rule: default thickness 4 dan warna accent bila style kosong", () => {
    const el: TemplateElement = { type: "rule", x: 0, y: 0.5, width: 0.2 };
    const out = build(makeCfg({ elements: [el] }));
    const rule = specOf<RectSpec>(out.specs, "rect", 1);
    expect(rule).toMatchObject({ height: 4, fill: "#F2C200" });
    expect(rule.angle).toBeUndefined();
  });

  it("footer: backgroundGradient role di-resolve, coords lokal ke box footer", () => {
    const el: TemplateElement = {
      type: "footer", x: 0.06, y: 0.9, width: 0.88, height: 0.06,
      slots: ["website"],
      style: { color: "#FFFFFF", backgroundGradient: ["accent", "primary"], backgroundGradientDirection: "to right" },
    };
    const out = build(makeCfg({ elements: [el] }));
    const f = specOf<FooterSpec>(out.specs, "footer");
    expect(f.backgroundGradient).toEqual({
      coords: { x1: 0, y1: 0, x2: 0.88 * 1080, y2: 0 },
      stops: [
        { offset: 0, color: "#F2C200" },
        { offset: 1, color: "#FFFFFF" },
      ],
    });
  });

  it("footer: backgroundColor role di-resolve; tanpa gradient → tanpa backgroundGradient", () => {
    const el: TemplateElement = {
      type: "footer", x: 0, y: 0.9, width: 1, height: 0.06,
      slots: [], style: { backgroundColor: "primary" },
    };
    const out = build(makeCfg({ elements: [el] }));
    const f = specOf<FooterSpec>(out.specs, "footer");
    expect(f.backgroundColor).toBe("#FFFFFF");
    expect(f.backgroundGradient).toBeUndefined();
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

  it("logo dengan logoUrl null → tidak menghasilkan spec, geometri elemen lain identik", () => {
    const el: TemplateElement = { type: "logo", source: "brand", x: 0.38, y: 0.04, width: 0.24, height: 0.1 };
    const sibling: TemplateElement = { type: "text", x: 0.06, y: 0.5, width: 0.88, value: "Headline" };

    const withLogo = build(makeCfg({ elements: [el, sibling] }));
    const withoutLogo = build(makeCfg({ elements: [el, sibling] }), { logoUrl: null });

    expect(withoutLogo.specs.filter((s) => s.kind === "image" && s.url === "https://cdn/logo.png")).toHaveLength(0);

    const siblingWith = specOf<TextSpec>(withLogo.specs, "text");
    const siblingWithout = specOf<TextSpec>(withoutLogo.specs, "text");
    expect(siblingWithout).toEqual(siblingWith);
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

  it("footer: SEMUA slot dipertahankan (ikon selalu tampil); teks kontak null bila kosong", () => {
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
    // hashtag tak ada di CONTACT → text null, tapi slot tetap ada supaya ikonnya digambar
    expect(f.items).toEqual([
      { slot: "website", text: "www.toko.com" },
      { slot: "instagram", text: "@toko" },
      { slot: "hashtag", text: null },
    ]);
  });

  it("footer: kontak profil terisi SEBAGIAN — field kosong ('') jadi ikon saja (text null)", () => {
    const el: TemplateElement = {
      type: "footer", x: 0.04, y: 0.93, width: 0.92, height: 0.05,
      slots: ["website", "instagram", "youtube"],
      style: { color: "primary", fontSize: 20 },
    };
    // Profil bisnis: website & instagram diisi, youtube dikosongkan.
    const contact = { website: "www.senja.com", instagram: "@kopisenja", youtube: "" };
    const out = build(makeCfg({ elements: [el] }), { contact });
    const f = specOf<FooterSpec>(out.specs, "footer");
    expect(f.items).toEqual([
      { slot: "website", text: "www.senja.com" },
      { slot: "instagram", text: "@kopisenja" },
      { slot: "youtube", text: null },
    ]);
  });
});

// ── Box pill (CTA) ────────────────────────────────────────────────────────────

describe("textBoxLayout — pill hug-content", () => {
  const box = { fill: "#F2C200", radius: 10, padX: 40, padY: 14 };
  // Textbox selebar kolom (500), teks terukur 200px, tinggi baris 31px
  const spec = { left: 100, width: 500, textAlign: "left" } as TextSpec;

  it("box mengapit teks: lebar = teks + 2·padX, tinggi = teks + 2·padY", () => {
    const l = textBoxLayout({ ...spec }, box, 200, 31, 300);
    expect(l.boxW).toBe(280);
    expect(l.boxH).toBe(59);
  });

  it("align left: teks digeser padX ke kanan dari tepi kiri box", () => {
    const l = textBoxLayout({ ...spec, textAlign: "left" }, box, 200, 31, 300);
    expect(l.boxLeft).toBe(100);
    expect(l.textLeft).toBe(140); // 100 + padX → padding kiri nyata, bukan nempel tepi
    expect(l.textTop).toBe(314);  // 300 + padY
  });

  it("align right: teks berjarak padX dari tepi kanan box", () => {
    const l = textBoxLayout({ ...spec, textAlign: "right" }, box, 200, 31, 300);
    // box rata kanan kolom → 100 + 500 - 280
    expect(l.boxLeft).toBe(320);
    // Textbox rata-kanan: tepi kanan teks = textLeft + width = 560 = boxRight(600) - padX
    expect(l.textLeft).toBe(60);
  });

  it("align center: teks tetap di tengah kolom, box ikut ter-pusat", () => {
    const l = textBoxLayout({ ...spec, textAlign: "center" }, box, 200, 31, 300);
    expect(l.boxLeft).toBe(210); // 100 + (500-280)/2
    expect(l.textLeft).toBe(100); // Textbox center-align sudah memusatkan teks
    // pusat box == pusat kolom teks
    expect(l.boxLeft + l.boxW / 2).toBe(spec.left + spec.width / 2);
  });

  it("padding nol → teks tepat di tepi box", () => {
    const l = textBoxLayout({ ...spec }, { ...box, padX: 0, padY: 0 }, 200, 31, 300);
    expect(l.textLeft).toBe(100);
    expect(l.boxW).toBe(200);
  });
});

// ── Budget vertikal (auto-fit) ────────────────────────────────────────────────

describe("buildCanvasSpec — fitBottom", () => {
  const headline: TemplateElement = {
    type: "text", role: "headline", x: 0.04, y: 0.19, width: 0.92,
    value: "GIGI BERLUBANG", style: { fontSize: 118 },
  };

  it("fitBottom = y elemen terdekat di bawah yang beririsan sumbu X", () => {
    const body: TemplateElement = { type: "text", x: 0.10, y: 0.30, width: 0.80, value: "b", style: {} };
    const out = build(makeCfg({ elements: [headline, body] }));
    // batas bawah absolut, bukan tinggi relatif → budget dihitung ulang setelah reflow
    expect(specOf<TextSpec>(out.specs, "text").fitBottom).toBeCloseTo(0.30 * 1350);
  });

  it("elemen di bawah tapi tidak beririsan X → diabaikan", () => {
    const sidebar: TemplateElement = { type: "text", x: 0.0, y: 0.22, width: 0.02, value: "s", style: {} };
    const narrow: TemplateElement = { ...headline, x: 0.50, width: 0.40 }; // 0.50–0.90
    const out = build(makeCfg({ elements: [narrow, sidebar] }));
    // sidebar 0.00–0.02 tak beririsan → batas = dasar kanvas
    expect(specOf<TextSpec>(out.specs, "text").fitBottom).toBeCloseTo(1350);
  });

  it("tanpa elemen di bawah → batas = dasar kanvas", () => {
    const out = build(makeCfg({ elements: [headline] }));
    expect(specOf<TextSpec>(out.specs, "text").fitBottom).toBeCloseTo(1350);
  });

  it("elemen non-teks (gambar/footer) ikut jadi batas", () => {
    const img: TemplateElement = { type: "image", source: "thumbnail", x: 0.06, y: 0.40, width: 0.88, height: 0.3 };
    const out = build(makeCfg({ elements: [headline, img] }), { thumbnailUrl: "https://cdn/x.png" });
    expect(specOf<TextSpec>(out.specs, "text").fitBottom).toBeCloseTo(0.40 * 1350);
  });

  it("anak group tidak diberi fitHeight (sudah mengalir, bukan absolut)", () => {
    const g: TemplateElement = {
      type: "group", x: 0.06, y: 0.2, width: 0.5, gap: 20,
      children: [{ type: "text", x: 0, y: 0, width: 1, value: "h", style: { fontSize: 80 } }],
    };
    const out = build(makeCfg({ elements: [g] }));
    expect(specOf<GroupSpec>(out.specs, "group").children[0].fitBottom).toBeUndefined();
  });
});

// ── Reflow: gap desain dijaga terhadap tinggi AKTUAL anchor ───────────────────

describe("flowedTop", () => {
  // anchor: authored 100..230 (tinggi 130), el authored top 250 → gap desain 20
  const anchor = { authoredBottom: 230, actualBottom: 230 };

  it("anchor setinggi rancangan → posisi tidak berubah", () => {
    expect(flowedTop(250, anchor)).toBe(250);
  });

  it("anchor menyusut → elemen naik, gap desain (20) dipertahankan", () => {
    expect(flowedTop(250, { authoredBottom: 230, actualBottom: 180 })).toBe(200);
  });

  it("anchor membesar → elemen TIDAK didorong turun (clamp di posisi authored)", () => {
    expect(flowedTop(250, { authoredBottom: 230, actualBottom: 300 })).toBe(250);
  });

  it("tanpa anchor → posisi authored", () => {
    expect(flowedTop(250, null)).toBe(250);
  });
});

describe("buildCanvasSpec — anchor rantai teks", () => {
  const els: TemplateElement[] = [
    { type: "logo", source: "brand", x: 0.36, y: 0.02, width: 0.28, height: 0.05 },
    { type: "text", role: "eyebrow", x: 0.10, y: 0.13, width: 0.80, value: "Tau Gak Sih?", style: { fontSize: 72 } },
    { type: "text", role: "headline", bind: "headline", x: 0.04, y: 0.19, width: 0.92, value: "GIGI", style: { fontSize: 118 } },
    { type: "text", role: "body", bind: "body", x: 0.10, y: 0.30, width: 0.80, value: "b", style: { fontSize: 36 } },
    { type: "image", source: "thumbnail", x: 0.06, y: 0.40, width: 0.88, height: 0.30 },
    { type: "text", role: "closing", x: 0.06, y: 0.74, width: 0.62, value: "c", style: { fontSize: 33 } },
  ];

  const texts = () => build(makeCfg({ elements: els }), { thumbnailUrl: "https://cdn/x.png" })
    .specs.filter((s): s is TextSpec => s.kind === "text");

  it("tiap teks berlabuh ke teks terdekat di atasnya yang beririsan X", () => {
    const [eyebrow, headline, body, closing] = texts();
    expect(eyebrow.anchorId).toBeUndefined();          // di atasnya logo (bukan teks)
    expect(headline.anchorId).toBe(eyebrow.id);
    expect(body.anchorId).toBe(headline.id);
    expect(closing.anchorId).toBeUndefined();          // di atasnya image (bukan teks)
  });

  it("templateValue dipakai sebagai teks authored; tanpa itu → value sekarang", () => {
    const merged = els.map((e) => (e.role === "headline" ? { ...e, value: "Kenapa Pipa Bisa Bocor?", templateValue: "GIGI" } : e));
    const [, headline, body] = build(makeCfg({ elements: merged }), { thumbnailUrl: "https://cdn/x.png" })
      .specs.filter((s): s is TextSpec => s.kind === "text");
    expect(headline.templateText).toBe("GIGI");
    expect(headline.text).toBe("Kenapa Pipa Bisa Bocor?");
    expect(body.templateText).toBe("b"); // tanpa templateValue → jatuh ke value
  });
});

// ── computeTextLayout: fit + reflow saling konsisten ─────────────────────────

describe("computeTextLayout", () => {
  const COL = 0.92 * 1080;   // 993.6
  const HEAD_TOP = 0.19 * 1350; // 256.5
  const BODY_TOP = 0.30 * 1350; // 405
  const IMG_TOP = 0.40 * 1350;  // 540

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

  const headline = (text: string, templateText: string): TextSpec => ({
    kind: "text", id: "h", text, templateText,
    left: 0.04 * 1080, top: HEAD_TOP, width: COL,
    fontSize: 118, fontFamily: "Poppins", fontWeight: "800", fill: "#000",
    textAlign: "center", lineHeight: 1.1, fitBottom: BODY_TOP,
  });

  const body = (text: string, templateText: string): TextSpec => ({
    kind: "text", id: "b", anchorId: "h", text, templateText,
    left: 0.10 * 1080, top: BODY_TOP, width: 0.80 * 1080,
    fontSize: 36, fontFamily: "Poppins", fontWeight: "600", fill: "#000",
    textAlign: "center", lineHeight: 1.3, fitBottom: IMG_TOP,
  });

  it("teks authored yang meluber ikut di-fit → body TIDAK ditarik ke dalam headline", () => {
    // "GIGI BERLUBANG" @118 melebar >kolom → 2 baris → melebihi budget-nya sendiri.
    // Kalau tinggi authored diukur mentah di 118px, gap desain jadi negatif dan body naik
    // menimpa headline (bug nyata). Tinggi authored harus diukur SETELAH fit.
    const specs = [headline("Pipa Anti Bocor?", "GIGI BERLUBANG"), body("Pernah repot ganti pipa?", "merupakan penyakit")];
    const layout = computeTextLayout(specs, measurerFor);

    const h = layout.get("h")!;
    const b = layout.get("b")!;
    expect(h.fontSize).toBeLessThan(118);        // headline menyusut agar 1 baris
    expect(b.top).toBeGreaterThanOrEqual(HEAD_TOP + h.fontSize * 1.1); // di BAWAH headline
    expect(b.top).toBeLessThanOrEqual(BODY_TOP); // tak pernah didorong turun
  });

  it("headline menyusut → body naik, gap desain positif dipertahankan", () => {
    // authored "Gigi" muat 1 baris @118 → bawah authored 386.3 → gap desain 18.7.
    // actual lebih panjang → menyusut ke ~100 → bawah aktual ~366.5 → body naik ke ~385.
    const specs = [headline("Kenapa Pipa Bocor?", "Gigi"), body("b", "b")];
    const layout = computeTextLayout(specs, measurerFor);

    const h = layout.get("h")!;
    const b = layout.get("b")!;
    expect(h.fontSize).toBeLessThan(118);
    expect(b.top).toBeLessThan(BODY_TOP);
    // gap desain dipertahankan terhadap bawah headline yang SEBENARNYA
    const designedGap = BODY_TOP - (HEAD_TOP + 118 * 1.1);
    expect(b.top - (HEAD_TOP + h.fontSize * 1.1)).toBeCloseTo(designedGap);
  });

  it("backward compat: tanpa templateValue (proyek lama) posisi = authored", () => {
    // templateText == text → tinggi authored == tinggi aktual → reflow jadi no-op
    const text = "Pipa Anti Bocor?";
    const specs = [headline(text, text), body("halo", "halo")];
    const layout = computeTextLayout(specs, measurerFor);
    expect(layout.get("b")!.top).toBe(BODY_TOP);
  });

  it("backward compat: copy authored persis → tak ada yang bergeser/mengecil", () => {
    const specs = [headline("Gigi", "Gigi"), body("halo", "halo")];
    const layout = computeTextLayout(specs, measurerFor);
    expect(layout.get("h")).toEqual({ top: HEAD_TOP, fontSize: 118 });
    expect(layout.get("b")).toEqual({ top: BODY_TOP, fontSize: 36 });
  });

  it("teks tanpa fitBottom (anak group) tidak pernah dikecilkan", () => {
    const free: TextSpec = { ...headline("teks yang sangat panjang sekali sampai berbaris", "x"), fitBottom: undefined, anchorId: undefined };
    expect(computeTextLayout([free], measurerFor).get("h")!.fontSize).toBe(118);
  });
});

describe("flowedTop — gap desain negatif", () => {
  it("anchor authored yang meluber (gap negatif) tidak menarik elemen ke atas", () => {
    // authoredBottom 516 > authoredTop 405 → gap mentah -111 → harus di-clamp ke 0
    expect(flowedTop(405, { authoredBottom: 516, actualBottom: 380 })).toBe(380);
  });

  it("gap negatif + anchor aktual panjang → tetap di posisi authored", () => {
    expect(flowedTop(405, { authoredBottom: 516, actualBottom: 500 })).toBe(405);
  });
});

describe("layer bebas gambar user", () => {
  const USER = { url: "https://cdn/foto.png", slot: null, overlay: { x: 0.2, y: 0.34, width: 0.6, height: 0.32 } };

  it("spec layer bebas ditandai interactive (bisa digeser)", () => {
    const cfg = makeCfg({ logoUrl: null, userImage: USER });
    const { specs } = buildCanvasSpec({ cfg, thumbnailUrl: null, contact: {} });
    const img = specs.find((s): s is ImageSpec => s.kind === "image")!;
    expect(img.interactive).toBe(true);
  });

  it("gambar di slot template TIDAK interactive — geometri milik template", () => {
    const cfg = makeCfg({
      logoUrl: null,
      elements: [{ type: "image", source: "thumbnail", x: 0.1, y: 0.1, width: 0.8, height: 0.3 }],
      userImage: { url: "https://cdn/foto.png", slot: { kind: "element", path: [0] }, overlay: null },
    });
    const { specs } = buildCanvasSpec({ cfg, thumbnailUrl: null, contact: {} });
    const img = specs.find((s): s is ImageSpec => s.kind === "image")!;
    expect(img.url).toBe("https://cdn/foto.png");
    expect(img.interactive).toBeUndefined();
  });

  it("rect layer bebas dipetakan ke px sesuai dimensi canvas", () => {
    const cfg = makeCfg({ logoUrl: null, userImage: USER });
    const { width, height, specs } = buildCanvasSpec({ cfg, thumbnailUrl: null, contact: {} });
    const img = specs.find((s): s is ImageSpec => s.kind === "image")!;
    expect(img.left).toBeCloseTo(0.2 * width);
    expect(img.top).toBeCloseTo(0.34 * height);
    expect(img.width).toBeCloseTo(0.6 * width);
  });
});
