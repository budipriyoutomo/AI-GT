import type {
  ColorScheme,
  TemplateElement,
} from "@/types/template";
import type { ResolvedConfig } from "@/lib/template/resolve";
import type { ResolvedUserImage } from "@/lib/template/image-slot";
import { blockHeight, fitFontSize, type MeasureBlock } from "./fit-text";

/**
 * Transformasi murni ResolvedConfig (brand & copy SUDAH diresolve — lihat lib/template/resolve.ts)
 * → daftar spec render pixel untuk canvas Fabric. Posisi fraksional → px, role color → hex,
 * letterSpacing → charSpacing, CSS shadow → objek. Layer Fabric tinggal menggambar.
 */

// ── Public types ──────────────────────────────────────────────────────────────

export interface GradientSpec {
  coords: { x1: number; y1: number; x2: number; y2: number }; // px canvas
  stops: { offset: number; color: string }[];
}

export interface RectSpec {
  kind: "rect";
  left: number;
  top: number;
  width: number;
  height: number;
  fill?: string;
  gradient?: GradientSpec;
  radius?: number; // px
  angle?: number;  // derajat, rotasi terhadap pusat rect
}

export interface ImageSpec {
  kind: "image";
  url: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fit: "cover" | "contain";
  radius?: number; // px
  angle?: number;
  skewX?: number;
  /** true = layer bebas gambar user: boleh digeser/resize di editor. Slot template tidak. */
  interactive?: boolean;
}

export interface TextSpec {
  kind: "text";
  text: string;
  templateText: string; // teks asli template → tinggi ideal yang diasumsikan desainer
  id: string;
  bind?: string;        // slot copy AI (headline/body/cta) — sumber batas input editor
  anchorId?: string;    // teks terdekat di atas yang beririsan X; posisi mengikuti bawahnya
  left: number;
  top: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle?: "italic";  // faux-italic (font tanpa face italic mis. Anton)
  fill: string;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
  angle?: number;       // rotasi blok teks (derajat, terhadap pusat) — paritas CSS transform:rotate
  skewX?: number;       // skewX derajat — miringkan geometri (CTA paralelogram)
  charSpacing?: number; // 1/1000 em (unit Fabric)
  fillGradient?: string[]; // hex, urut sesuai arah
  fillGradientCoords?: { x1: number; y1: number; x2: number; y2: number }; // ternormalisasi 0..1
  stroke?: { color: string; width: number };
  shadow?: { offsetX: number; offsetY: number; blur: number; color: string };
  accent?: { start: number; end: number; fill: string; fontWeight: string };
  // box treatment (CTA pill): latar hug-content di belakang teks
  box?: { fill: string; radius: number; padX: number; padY: number }; // px
  // px — garis y elemen penghalang berikutnya. Batas ABSOLUT (bukan tinggi relatif) agar
  // budget bisa dihitung ulang dari posisi hasil reflow, bukan dari posisi authored.
  fitBottom?: number;
}

export interface GroupSpec {
  kind: "group";
  left: number;
  width: number;
  y: number; // px — garis anchor (top atau bottom cluster)
  anchor: "top" | "bottom";
  gap: number; // px
  children: TextSpec[];
}

export interface FooterSpec {
  kind: "footer";
  left: number;
  top: number;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundGradient?: GradientSpec; // menang atas backgroundColor
  opacity: number;
  color: string;
  fontSize: number;
  angle?: number;
  skewX?: number;
  // Satu entri per slot (urut). `text` = kontak dari company profile (null → ikon saja).
  // Ikon SELALU dirender (paritas SocialIcon di TemplateRenderer).
  items: { slot: string; text: string | null }[];
}

export type CanvasSpec = RectSpec | ImageSpec | TextSpec | GroupSpec | FooterSpec;

export interface CanvasSpecResult {
  width: number;
  height: number;
  specs: CanvasSpec[];
}

export interface CanvasSpecInput {
  cfg: ResolvedConfig;
  thumbnailUrl?: string | null; // templates.thumbnail_url — background/foreground image
  contact?: Record<string, string>;
  tagline?: string | null;      // company_profile.tagline — isi elemen tipe "tagline"
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_WIDTH = 1080; // fontSize/letterSpacing template didefinisikan di ruang 1080px
const DEFAULT_ASPECT = "4:5";

// ── Color helpers ─────────────────────────────────────────────────────────────

function resolveColor(scheme: ColorScheme, role?: string): string {
  if (!role) return "#000000";
  if (role.startsWith("#")) return role;
  return scheme[role] ?? role;
}

function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

// "to bottom" / "180deg" → koordinat linear-gradient dalam px area target
function gradientCoords(direction: string | undefined, w: number, h: number) {
  switch ((direction ?? "to bottom").trim()) {
    case "to top":    return { x1: 0, y1: h, x2: 0, y2: 0 };
    case "to right":  return { x1: 0, y1: 0, x2: w, y2: 0 };
    case "to left":   return { x1: w, y1: 0, x2: 0, y2: 0 };
    case "to bottom":
    default:          return { x1: 0, y1: 0, x2: 0, y2: h };
  }
}

// "0.5em 1.4em" → { padY, padX } px. em relatif fontSize (sudah dalam px canvas), px ikut skala.
function parsePadding(css: string, fontSize: number, scale: number): { padX: number; padY: number } {
  const toPx = (part: string) => {
    const n = parseFloat(part);
    if (Number.isNaN(n)) return 0;
    return part.includes("em") ? n * fontSize : n * scale;
  };
  const parts = css.trim().split(/\s+/);
  const padY = toPx(parts[0]);
  // 1 nilai → seragam; 2+ nilai → [vertikal, horizontal] (nilai ke-3/4 CSS diabaikan)
  const padX = parts.length > 1 ? toPx(parts[1]) : padY;
  return { padX, padY };
}

// "0 4px 12px rgba(0,0,0,0.35)" → komponen shadow
function parseTextShadow(css: string): TextSpec["shadow"] | undefined {
  const colorMatch = css.match(/(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})/);
  const color = colorMatch?.[0] ?? "rgba(0,0,0,0.3)";
  const nums = css
    .replace(color, "")
    .trim()
    .split(/\s+/)
    .map((p) => parseFloat(p));
  if (nums.length < 2 || nums.some(Number.isNaN)) return undefined;
  const [offsetX, offsetY, blur = 0] = nums;
  return { offsetX, offsetY, blur, color };
}

// ── Budget & reflow ───────────────────────────────────────────────────────────

/**
 * Garis y tempat elemen teks absolut mulai menabrak: elemen TERDEKAT di bawahnya yang
 * beririsan pada sumbu X. Yang tidak beririsan X (kolom sebelah) tidak membatasi.
 *
 * Dikembalikan sebagai batas ABSOLUT, bukan tinggi relatif: setelah reflow menaikkan
 * elemen, budget-nya bertambah — dan hanya batas absolut yang menangkap itu.
 */
export function obstacleY(el: TemplateElement, siblings: TemplateElement[], canvasH: number): number {
  const left = el.x;
  const right = el.x + el.width;
  let nextY = 1;
  for (const other of siblings) {
    if (other === el || other.y <= el.y) continue;
    if (other.x + other.width <= left || other.x >= right) continue; // kolom terpisah
    nextY = Math.min(nextY, other.y);
  }
  return nextY * canvasH;
}

/** Teks terdekat di atas `el` yang beririsan pada sumbu X — anchor reflow-nya. */
function anchorIndexOf(el: TemplateElement, siblings: TemplateElement[]): number | undefined {
  const left = el.x;
  const right = el.x + el.width;
  let best: number | undefined;
  let bestY = -1;
  siblings.forEach((other, i) => {
    if (other === el || other.y >= el.y) return;
    if (other.x + other.width <= left || other.x >= right) return; // kolom terpisah
    if (other.y > bestY) {
      bestY = other.y;
      best = i;
    }
  });
  // Hanya teks yang tingginya bisa berubah; elemen lain adalah jangkar tetap.
  return best !== undefined && siblings[best].type === "text" ? best : undefined;
}

/**
 * Posisi atas sebuah teks setelah reflow: jaga GAP DESAIN (jarak dari bawah anchor
 * versi authored ke atas elemen ini) terhadap bawah anchor yang SEBENARNYA ter-render.
 *
 * Anchor menyusut (auto-fit mengecilkan copy panjang) → elemen ini ikut naik, jadi
 * tidak ada lubang menganga. Anchor membesar → elemen TIDAK didorong turun (di-clamp
 * ke posisi authored) supaya tidak menabrak elemen non-teks di bawahnya yang tetap diam.
 */
export function flowedTop(
  authoredTop: number,
  anchor: { authoredBottom: number; actualBottom: number } | null,
): number {
  if (!anchor) return authoredTop;
  // Gap tak pernah negatif. Teks authored bisa saja melebihi ruangnya sendiri; gap mentah
  // jadi negatif dan elemen ini akan ditarik MASUK ke dalam anchor, bukan di bawahnya.
  const designedGap = Math.max(0, authoredTop - anchor.authoredBottom);
  return Math.min(authoredTop, anchor.actualBottom + designedGap);
}

// ── Box pill (CTA) ────────────────────────────────────────────────────────────

/**
 * Geometri box pill hug-content di belakang teks — paritas `<span inline-block>`
 * berlatar di TemplateRenderer, di mana padding menggeser teks DAN memperbesar box.
 *
 * Fabric Textbox selalu selebar kolom (`spec.width`) dan meratakan teks di dalamnya,
 * jadi padding horizontal harus diterapkan dengan menggeser Textbox-nya:
 *   left   → teks digeser +padX (kalau tidak, teks nempel tepi kiri box)
 *   right  → teks digeser -padX
 *   center → tidak digeser; Textbox sudah memusatkan teks, dan box ikut ter-pusat
 *
 * `textWidth`/`textHeight` diukur oleh layer Fabric (butuh font metrics).
 */
export function textBoxLayout(
  spec: Pick<TextSpec, "left" | "width" | "textAlign">,
  box: NonNullable<TextSpec["box"]>,
  textWidth: number,
  textHeight: number,
  top: number,
) {
  const boxW = textWidth + box.padX * 2;
  const boxH = textHeight + box.padY * 2;
  const boxLeft =
    spec.textAlign === "center" ? spec.left + (spec.width - boxW) / 2
    : spec.textAlign === "right" ? spec.left + spec.width - boxW
    : spec.left;
  const textLeft =
    spec.textAlign === "center" ? spec.left
    : spec.textAlign === "right" ? spec.left - box.padX
    : spec.left + box.padX;
  return { boxLeft, boxW, boxH, textLeft, textTop: top + box.padY };
}

// ── Layout teks: fit + reflow ─────────────────────────────────────────────────

export interface TextLayout {
  top: number;
  fontSize: number;
}

/**
 * Ukuran font terpakai untuk `text` bila diletakkan pada `top`. Tanpa `fitBottom`
 * (anak group) tak ada budget → ukuran template dipakai apa adanya.
 */
function fittedSize(spec: TextSpec, text: string, top: number, measure: MeasureBlock): number {
  if (!spec.fitBottom) return spec.fontSize;
  return fitFontSize(
    {
      text,
      maxWidth: spec.width,
      maxHeight: spec.fitBottom - top,
      fontSize: spec.fontSize,
      lineHeight: spec.lineHeight,
    },
    measure,
  );
}

/**
 * Posisi & ukuran final tiap teks absolut. Diproses dari atas ke bawah: bawah anchor
 * harus sudah diketahui sebelum elemen yang berlabuh padanya dihitung. Urutan dalam
 * satu elemen: top (dari anchor) → budget (dari top) → fontSize (fit) → tinggi aktual.
 *
 * Tinggi AUTHORED diukur lewat jalur fit yang SAMA, bukan mentah di fontSize template.
 * Teks authored pun tunduk auto-fit saat dirender; mengukurnya mentah bisa menghasilkan
 * "bawah authored" di luar budget → gap desain negatif → elemen berikutnya ditarik naik
 * menimpa anchor-nya.
 */
export function computeTextLayout(
  specs: CanvasSpec[],
  measurerFor: (spec: TextSpec) => MeasureBlock,
): Map<string, TextLayout> {
  const texts = specs.filter((s): s is TextSpec => s.kind === "text").sort((a, b) => a.top - b.top);
  const bottoms = new Map<string, { authoredBottom: number; actualBottom: number }>();
  const layout = new Map<string, TextLayout>();

  for (const spec of texts) {
    const measure = measurerFor(spec);

    const top = flowedTop(spec.top, (spec.anchorId && bottoms.get(spec.anchorId)) || null);
    const fontSize = fittedSize(spec, spec.text, top, measure);

    // "Di mana teks template ini akan berakhir, di bawah aturan yang sama?"
    const authoredSize = fittedSize(spec, spec.templateText, spec.top, measure);
    const authoredH = blockHeight(measure(spec.templateText, authoredSize).lines, authoredSize, spec.lineHeight);
    const actualH = blockHeight(measure(spec.text, fontSize).lines, fontSize, spec.lineHeight);

    layout.set(spec.id, { top, fontSize });
    bottoms.set(spec.id, { authoredBottom: spec.top + authoredH, actualBottom: top + actualH });
  }
  return layout;
}

// ── Element builders ──────────────────────────────────────────────────────────

interface Ctx {
  w: number;
  h: number;
  scale: number; // w / 1080 — skala ruang font template → canvas
  scheme: ColorScheme;
  defaultFont: string;
  thumbnailUrl: string | null;
  logoUrl: string | null;
  contact: Record<string, string>;
  tagline: string;
  siblings: TemplateElement[]; // elemen top-level — sumber budget auto-fit & anchor
  /** Gambar konten user, sudah ditempatkan resolver (slot template / layer bebas). */
  userImage: ResolvedUserImage;
  /** Elemen yang jadi slot gambar user — dibanding by-reference saat menggambar. */
  userImageEl: TemplateElement | null;
}

function textSpec(el: TemplateElement, ctx: Ctx, overrides: Partial<TextSpec> = {}): TextSpec {
  const s = el.style ?? {};
  const fontSize = (s.fontSize ?? 32) * ctx.scale;
  const value = el.value ?? "";

  let accent: TextSpec["accent"];
  if (s.accentWords && value.includes(s.accentWords)) {
    const start = value.indexOf(s.accentWords);
    accent = {
      start,
      end: start + s.accentWords.length,
      fill: resolveColor(ctx.scheme, s.accentColor),
      fontWeight: s.accentWeight ?? "700",
    };
  }

  return {
    kind: "text",
    text: value,
    templateText: el.templateValue ?? value,
    id: "",
    bind: el.bind,
    left: el.x * ctx.w,
    top: el.y * ctx.h,
    width: el.width * ctx.w,
    fontSize,
    fontFamily: s.fontFamily ?? ctx.defaultFont,
    fontWeight: s.weight ?? "400",
    fontStyle: s.italic ? "italic" : undefined,
    fill: resolveColor(ctx.scheme, s.color),
    textAlign: ((el.align ?? s.align) as TextSpec["textAlign"]) ?? "left",
    lineHeight: s.lineHeight ?? 1.1,
    // rotate/skew blok — paritas transform:rotate()/skewX() + transformOrigin:center di TemplateRenderer
    angle: s.rotate ?? undefined,
    skewX: s.skew ?? undefined,
    charSpacing: s.letterSpacing != null ? (s.letterSpacing * ctx.scale * 1000) / fontSize : undefined,
    // stop boleh role → resolve agar gradient teks ikut brand adapt (paritas TemplateRenderer)
    fillGradient: s.fillGradient?.map((c) => resolveColor(ctx.scheme, c)),
    // arah dalam ruang ternormalisasi; default "180deg" = vertikal
    fillGradientCoords: s.fillGradient ? gradientCoords(s.fillGradientDirection, 1, 1) : undefined,
    stroke: s.stroke ? { color: resolveColor(ctx.scheme, s.stroke.color), width: s.stroke.width * ctx.scale } : undefined,
    shadow: s.shadow ? parseTextShadow(s.shadow) : undefined,
    accent,
    box: s.background
      ? {
          fill: resolveColor(ctx.scheme, s.background),
          radius: (s.radius ?? 0) * ctx.scale,
          ...parsePadding(s.padding ?? "0", fontSize, ctx.scale),
        }
      : undefined,
    ...overrides,
  };
}

const elementId = (i: number) => `el${i}`;

function elementSpecs(el: TemplateElement, ctx: Ctx, index: number): CanvasSpec[] {
  switch (el.type) {
    case "text": {
      // Hanya teks absolut yang punya budget & anchor; anak group sudah mengalir vertikal.
      const anchor = anchorIndexOf(el, ctx.siblings);
      return [textSpec(el, ctx, {
        id: elementId(index),
        anchorId: anchor !== undefined ? elementId(anchor) : undefined,
        fitBottom: obstacleY(el, ctx.siblings, ctx.h),
      })];
    }

    case "tagline": {
      // Isi dari company_profile.tagline; kosong → placeholder value template.
      // Styling & posisi persis seperti "text" (paritas TaglineElement di TemplateRenderer).
      const text = ctx.tagline || el.value || "Tagline Perusahaan";
      const anchor = anchorIndexOf(el, ctx.siblings);
      return [textSpec(el, ctx, {
        id: elementId(index),
        text,
        templateText: text,
        anchorId: anchor !== undefined ? elementId(anchor) : undefined,
        fitBottom: obstacleY(el, ctx.siblings, ctx.h),
      })];
    }

    case "scrim": {
      if (!el.gradient) return [];
      const w = el.width * ctx.w;
      const h = (el.height ?? 1) * ctx.h;
      return [{
        kind: "rect",
        left: el.x * ctx.w,
        top: el.y * ctx.h,
        width: w,
        height: h,
        gradient: {
          coords: gradientCoords(el.gradient.direction, w, h),
          stops: el.gradient.stops.map((st) => ({
            offset: st.position / 100,
            color: hexToRgba(st.color, st.alpha),
          })),
        },
      }];
    }

    case "logo": {
      if (!ctx.logoUrl) return [];
      return [{
        kind: "image",
        url: ctx.logoUrl,
        left: el.x * ctx.w,
        top: el.y * ctx.h,
        width: el.width * ctx.w,
        height: (el.height ?? 0.08) * ctx.h,
        fit: "contain",
      }];
    }

    case "image": {
      // Gambar user (jika elemen ini slotnya) menang atas thumbnail template.
      const isUserSlot = ctx.userImageEl === el;
      const url = isUserSlot ? ctx.userImage.url : el.source === "thumbnail" ? ctx.thumbnailUrl : null;
      // Foto foreground dari templates.thumbnail_url — kosong → jangan render
      if (!url) return [];
      const s = el.style ?? {};
      return [{
        kind: "image",
        url,
        left: el.x * ctx.w,
        top: el.y * ctx.h,
        width: el.width * ctx.w,
        height: (el.height ?? 0.3) * ctx.h,
        fit: el.fit === "contain" ? "contain" : "cover",
        radius: el.radius != null ? el.radius * ctx.scale : undefined,
        angle: s.rotate ?? undefined,
        skewX: s.skew ?? undefined,
      }];
    }

    case "rule": {
      const s = el.style ?? {};
      return [{
        kind: "rect",
        left: el.x * ctx.w,
        top: el.y * ctx.h,
        width: el.width * ctx.w,
        height: (s.thickness ?? 4) * ctx.scale,
        fill: resolveColor(ctx.scheme, s.color ?? "accent"),
        radius: 2 * ctx.scale,
        angle: s.rotate ?? undefined,
      }];
    }

    case "group": {
      const left = el.x * ctx.w;
      const width = el.width * ctx.w;
      const children = (el.children ?? [])
        .filter((c) => c.type === "text")
        .map((c) => textSpec(c, ctx, { left, top: 0, width }));
      return [{
        kind: "group",
        left,
        width,
        y: el.y * ctx.h,
        anchor: el.anchor === "bottom" ? "bottom" : "top",
        gap: (el.gap ?? 16) * ctx.scale,
        children,
      }];
    }

    case "footer": {
      const s = el.style ?? {};
      const w = el.width * ctx.w;
      const h = (el.height ?? 0.06) * ctx.h;
      const grad = s.backgroundGradient;
      return [{
        kind: "footer",
        left: el.x * ctx.w,
        top: el.y * ctx.h,
        width: w,
        height: h,
        backgroundColor: s.backgroundColor ? resolveColor(ctx.scheme, s.backgroundColor) : "transparent",
        // Gradient latar menang atas backgroundColor; default horizontal (paritas TemplateRenderer)
        backgroundGradient: grad?.length
          ? {
              coords: gradientCoords(s.backgroundGradientDirection ?? "to right", w, h),
              stops: grad.map((color, i) => ({
                offset: grad.length > 1 ? i / (grad.length - 1) : 0,
                color: resolveColor(ctx.scheme, color),
              })),
            }
          : undefined,
        opacity: s.opacity ?? 1,
        color: resolveColor(ctx.scheme, s.color),
        fontSize: (s.fontSize ?? 20) * ctx.scale,
        angle: s.rotate ?? undefined,
        skewX: s.skew ?? undefined,
        // Semua slot dipertahankan agar ikon tetap tampil walau kontak kosong.
        // Nilai kosong/"" → null (ikon saja), paritas dengan TemplateRenderer (`contact[slot] && …`).
        items: (el.slots ?? []).map((slot) => ({ slot, text: ctx.contact[slot] || null })),
      }];
    }

    default:
      return [];
  }
}

// ── Background ────────────────────────────────────────────────────────────────

function backgroundSpecs(cfg: ResolvedConfig, ctx: Ctx): CanvasSpec[] {
  const bg = cfg.background;
  const full = { left: 0, top: 0, width: ctx.w, height: ctx.h };

  if (!bg) return [{ kind: "rect", ...full, fill: "#111111" }];

  if (bg.type === "gradient") {
    const stops = bg.stops ?? [];
    return [{
      kind: "rect",
      ...full,
      gradient: {
        coords: gradientCoords(bg.direction, ctx.w, ctx.h),
        stops: stops.map((color, i) => ({
          offset: stops.length > 1 ? i / (stops.length - 1) : 0,
          color,
        })),
      },
    }];
  }

  if (bg.type === "image") {
    const specs: CanvasSpec[] = [{ kind: "rect", ...full, fill: bg.fallback ?? "#111111" }];
    const url =
      ctx.userImage.slot?.kind === "background" ? ctx.userImage.url : ctx.thumbnailUrl;
    if (url) {
      specs.push({ kind: "image", url, ...full, fit: "cover" });
    }
    return specs;
  }

  return [{ kind: "rect", ...full, fill: bg.value ?? "#111111" }];
}

// ── Main export ───────────────────────────────────────────────────────────────

/** Telusuri path slot (index per level, menembus `group`) ke elemen konkret. */
function elementAtPath(elements: TemplateElement[], path: number[]): TemplateElement | null {
  let current: TemplateElement | undefined;
  let level = elements;
  for (const i of path) {
    current = level[i];
    if (!current) return null;
    level = current.children ?? [];
  }
  return current ?? null;
}

export function buildCanvasSpec(input: CanvasSpecInput): CanvasSpecResult {
  const { cfg } = input;
  const userImage: ResolvedUserImage = cfg.userImage ?? { url: null, slot: null, overlay: null };

  const dims = cfg.canvas?.dimensions;
  const [aw, ah] = (cfg.canvas?.aspect ?? DEFAULT_ASPECT).split(":").map(Number);
  const width = dims?.width ?? BASE_WIDTH;
  const height = dims?.height ?? Math.round((width * (ah || 5)) / (aw || 4));

  const ctx: Ctx = {
    w: width,
    h: height,
    scale: width / BASE_WIDTH,
    scheme: cfg.color_scheme ?? ({} as ColorScheme),
    defaultFont: cfg.font?.family ?? "Inter",
    thumbnailUrl: input.thumbnailUrl ?? null,
    logoUrl: cfg.logoUrl ?? null,
    contact: input.contact ?? {},
    tagline: input.tagline ?? "",
    siblings: cfg.elements ?? [],
    userImage,
    userImageEl:
      userImage.slot?.kind === "element"
        ? elementAtPath(cfg.elements ?? [], userImage.slot.path)
        : null,
  };

  const specs: CanvasSpec[] = [
    ...backgroundSpecs(cfg, ctx),
    ...(cfg.elements ?? []).flatMap((el, i) => elementSpecs(el, ctx, i)),
  ];

  // Fallback layer bebas: template tak punya slot gambar → gambar user ditaruh
  // di atas semua elemen, pada rect bersama dengan TemplateRenderer.
  if (userImage.url && userImage.overlay) {
    const r = userImage.overlay;
    specs.push({
      kind: "image",
      url: userImage.url,
      left: r.x * width,
      top: r.y * height,
      width: r.width * width,
      height: r.height * height,
      fit: "contain",
      interactive: true,
    });
  }

  return { width, height, specs };
}
