import type {
  ColorScheme,
  TemplateConfig,
  TemplateElement,
} from "@/types/template";

/**
 * Transformasi murni template_config → daftar spec render pixel untuk canvas Fabric.
 * Semua resolusi (posisi fraksional → px, role color → hex, letterSpacing → charSpacing,
 * CSS shadow → objek) terjadi di sini agar layer Fabric tinggal menggambar.
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
}

export interface TextSpec {
  kind: "text";
  text: string;
  left: number;
  top: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fill: string;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
  charSpacing?: number; // 1/1000 em (unit Fabric)
  fillGradient?: string[]; // hex top→bottom
  stroke?: { color: string; width: number };
  shadow?: { offsetX: number; offsetY: number; blur: number; color: string };
  accent?: { start: number; end: number; fill: string; fontWeight: string };
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
  opacity: number;
  color: string;
  fontSize: number;
  items: string[];
}

export type CanvasSpec = RectSpec | ImageSpec | TextSpec | GroupSpec | FooterSpec;

export interface CanvasSpecResult {
  width: number;
  height: number;
  specs: CanvasSpec[];
}

export interface CanvasSpecInput {
  cfg: TemplateConfig;
  thumbnailUrl?: string | null; // templates.thumbnail_url — background/foreground image
  logoUrl?: string | null;
  contact?: Record<string, string>;
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
    left: el.x * ctx.w,
    top: el.y * ctx.h,
    width: el.width * ctx.w,
    fontSize,
    fontFamily: s.fontFamily ?? ctx.defaultFont,
    fontWeight: s.weight ?? "400",
    fill: resolveColor(ctx.scheme, s.color),
    textAlign: ((el.align ?? s.align) as TextSpec["textAlign"]) ?? "left",
    lineHeight: s.lineHeight ?? 1.1,
    charSpacing: s.letterSpacing != null ? (s.letterSpacing * ctx.scale * 1000) / fontSize : undefined,
    fillGradient: s.fillGradient,
    stroke: s.stroke ? { color: resolveColor(ctx.scheme, s.stroke.color), width: s.stroke.width * ctx.scale } : undefined,
    shadow: s.shadow ? parseTextShadow(s.shadow) : undefined,
    accent,
    ...overrides,
  };
}

function elementSpecs(el: TemplateElement, ctx: Ctx): CanvasSpec[] {
  switch (el.type) {
    case "text":
      return [textSpec(el, ctx)];

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
      // Foto foreground dari templates.thumbnail_url — kosong → jangan render
      if (el.source !== "thumbnail" || !ctx.thumbnailUrl) return [];
      return [{
        kind: "image",
        url: ctx.thumbnailUrl,
        left: el.x * ctx.w,
        top: el.y * ctx.h,
        width: el.width * ctx.w,
        height: (el.height ?? 0.3) * ctx.h,
        fit: el.fit === "contain" ? "contain" : "cover",
        radius: el.radius != null ? el.radius * ctx.scale : undefined,
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
      return [{
        kind: "footer",
        left: el.x * ctx.w,
        top: el.y * ctx.h,
        width: el.width * ctx.w,
        height: (el.height ?? 0.06) * ctx.h,
        backgroundColor: s.backgroundColor ?? "transparent",
        opacity: s.opacity ?? 1,
        color: resolveColor(ctx.scheme, s.color),
        fontSize: (s.fontSize ?? 20) * ctx.scale,
        items: (el.slots ?? [])
          .map((slot) => ctx.contact[slot])
          .filter((v): v is string => !!v),
      }];
    }

    default:
      return [];
  }
}

// ── Background ────────────────────────────────────────────────────────────────

function backgroundSpecs(cfg: TemplateConfig, ctx: Ctx): CanvasSpec[] {
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
    if (ctx.thumbnailUrl) {
      specs.push({ kind: "image", url: ctx.thumbnailUrl, ...full, fit: "cover" });
    }
    return specs;
  }

  return [{ kind: "rect", ...full, fill: bg.value ?? "#111111" }];
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildCanvasSpec(input: CanvasSpecInput): CanvasSpecResult {
  const { cfg } = input;

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
    logoUrl: input.logoUrl ?? null,
    contact: input.contact ?? {},
  };

  const specs: CanvasSpec[] = [
    ...backgroundSpecs(cfg, ctx),
    ...(cfg.elements ?? []).flatMap((el) => elementSpecs(el, ctx)),
  ];

  return { width, height, specs };
}
