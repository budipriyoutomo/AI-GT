"use client";

import { forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import type { Canvas, Textbox } from "fabric";
import type {
  CanvasSpecResult,
  FooterSpec,
  GroupSpec,
  ImageSpec,
  RectSpec,
  TextSpec,
} from "@/lib/editor/canvas-spec";

/**
 * Canvas Fabric yang menggambar template_config (via CanvasSpecResult dari
 * buildCanvasSpec) — tampilan editor 1:1 dengan preview template, export PNG
 * pada resolusi asli template (mis. 1080×1350).
 */

export interface TemplateFabricCanvasHandle {
  exportPng: () => Promise<Blob | null>;
}

// Lebar tampilan dasar — zoom 1.0 ≈ 800px, konsisten dengan FabricCanvas lama
const DISPLAY_BASE_WIDTH = 800;

// ── Font resolution ───────────────────────────────────────────────────────────

// Family template → CSS variable next/font (nilai variable = family ter-hash)
const FONT_VARS: Record<string, string> = {
  Poppins: "--font-poppins",
  Montserrat: "--font-montserrat",
  Inter: "--font-inter",
};

function resolveFontStack(family: string): string {
  const varName = FONT_VARS[family];
  if (varName && typeof window !== "undefined") {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (v) return v;
  }
  return `'${family}', sans-serif`;
}

// ── Image cache ───────────────────────────────────────────────────────────────

interface LoadedImage {
  el: HTMLImageElement;
  cors: boolean; // false = host tanpa header CORS — menggambar akan men-taint canvas
}

// Cache antar-rebuild agar edit teks tidak memicu network fetch gambar ulang
const imageElementCache = new Map<string, Promise<LoadedImage | null>>();

function loadImageElement(url: string): Promise<LoadedImage | null> {
  const hit = imageElementCache.get(url);
  if (hit) return hit;
  const p = new Promise<LoadedImage | null>((resolve) => {
    // Coba CORS dulu (aman untuk export); gagal → load biasa agar tetap tampil,
    // objeknya ditandai dan disembunyikan sementara saat export.
    const tryLoad = (cors: boolean) => {
      const img = new Image();
      if (cors) img.crossOrigin = "anonymous";
      img.onload = () => resolve({ el: img, cors });
      img.onerror = () => (cors ? tryLoad(false) : resolve(null));
      img.src = url;
    };
    tryLoad(true);
  });
  imageElementCache.set(url, p);
  return p;
}

// ── Fabric object builders ────────────────────────────────────────────────────

type FabricNS = typeof import("fabric");

function makeGradient(f: FabricNS, g: NonNullable<RectSpec["gradient"]>) {
  return new f.Gradient({
    type: "linear",
    gradientUnits: "pixels",
    coords: g.coords,
    colorStops: g.stops.map((s) => ({ offset: s.offset, color: s.color })),
  });
}

function makeRect(f: FabricNS, spec: RectSpec) {
  const rect = new f.Rect({
    left: spec.left, top: spec.top, width: spec.width, height: spec.height,
    selectable: false, evented: false,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rect.set("fill", spec.gradient ? (makeGradient(f, spec.gradient) as any) : (spec.fill ?? "transparent"));
  return rect;
}

// accent range global → format styles Fabric (per baris \n, per karakter)
function accentToStyles(text: string, accent: NonNullable<TextSpec["accent"]>) {
  const styles: Record<number, Record<number, { fill: string; fontWeight: string }>> = {};
  let idx = 0;
  text.split("\n").forEach((line, li) => {
    for (let ci = 0; ci < line.length; ci++, idx++) {
      if (idx >= accent.start && idx < accent.end) {
        (styles[li] ??= {})[ci] = { fill: accent.fill, fontWeight: accent.fontWeight };
      }
    }
    idx++; // karakter \n
  });
  return styles;
}

function makeText(f: FabricNS, spec: TextSpec): Textbox {
  const tb = new f.Textbox(spec.text, {
    left: spec.left,
    top: spec.top,
    width: spec.width,
    fontSize: spec.fontSize,
    fontFamily: resolveFontStack(spec.fontFamily),
    fontWeight: spec.fontWeight,
    fill: spec.fill,
    textAlign: spec.textAlign,
    lineHeight: spec.lineHeight,
    charSpacing: spec.charSpacing ?? 0,
    selectable: false,
    evented: false,
  });

  if (spec.fillGradient?.length) {
    const grad = new f.Gradient({
      type: "linear",
      gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: spec.fillGradient.map((color, i, arr) => ({
        offset: arr.length > 1 ? i / (arr.length - 1) : 0,
        color,
      })),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tb.set("fill", grad as any);
  }
  if (spec.stroke) {
    tb.set({ stroke: spec.stroke.color, strokeWidth: spec.stroke.width, paintFirst: "stroke" });
  }
  if (spec.shadow) {
    tb.set("shadow", new f.Shadow(spec.shadow));
  }
  if (spec.accent) {
    tb.set("styles", accentToStyles(spec.text, spec.accent));
  }
  return tb;
}

function makeImage(f: FabricNS, spec: ImageSpec, { el, cors }: LoadedImage) {
  const iw = el.naturalWidth || 1;
  const ih = el.naturalHeight || 1;
  const scale = spec.fit === "contain"
    ? Math.min(spec.width / iw, spec.height / ih)
    : Math.max(spec.width / iw, spec.height / ih);

  const img = new f.FabricImage(el, {
    // contain → center di dalam box; cover → mulai dari kiri-atas lalu di-clip
    left: spec.left + (spec.fit === "contain" ? (spec.width - iw * scale) / 2 : 0),
    top: spec.top + (spec.fit === "contain" ? (spec.height - ih * scale) / 2 : 0),
    scaleX: scale,
    scaleY: scale,
    selectable: false,
    evented: false,
  });

  if (spec.fit === "cover" || spec.radius) {
    img.clipPath = new f.Rect({
      left: spec.left, top: spec.top, width: spec.width, height: spec.height,
      rx: spec.radius ?? 0, ry: spec.radius ?? 0,
      absolutePositioned: true,
    });
  }
  if (spec.fit === "contain") {
    // produk transparan → drop shadow biar "float" (paritas dengan TemplateRenderer)
    img.set("shadow", new f.Shadow({ offsetX: 0, offsetY: 8, blur: 16, color: "rgba(0,0,0,0.32)" }));
  }
  // Gambar non-CORS: tampil di editor, tapi harus disembunyikan saat export
  // supaya canvas hasil export tidak tainted
  (img as unknown as { aigtNoCors?: boolean }).aigtNoCors = !cors;
  return img;
}

// Group: anak mengalir vertikal dengan gap tetap; anchor bottom = tumbuh ke atas
function makeGroupObjects(f: FabricNS, spec: GroupSpec) {
  const boxes = spec.children.map((c) => makeText(f, c));
  const heights = boxes.map((b) => b.height ?? 0);
  const totalH = heights.reduce((a, b) => a + b, 0) + spec.gap * Math.max(boxes.length - 1, 0);

  let y = spec.anchor === "bottom" ? spec.y - totalH : spec.y;
  boxes.forEach((b, i) => {
    b.set({ top: y });
    y += heights[i] + spec.gap;
  });
  return boxes;
}

function makeFooterObjects(f: FabricNS, spec: FooterSpec) {
  const objs = [];
  if (spec.backgroundColor && spec.backgroundColor !== "transparent") {
    objs.push(new f.Rect({
      left: spec.left, top: spec.top, width: spec.width, height: spec.height,
      fill: spec.backgroundColor, opacity: spec.opacity,
      rx: spec.height / 2, ry: spec.height / 2,
      selectable: false, evented: false,
    }));
  }
  if (spec.items.length) {
    objs.push(new f.FabricText(spec.items.join("   ·   "), {
      left: spec.left + spec.width * 0.03,
      top: spec.top + spec.height / 2,
      originY: "center",
      fontSize: spec.fontSize,
      fontFamily: resolveFontStack("Inter"),
      fill: spec.color,
      opacity: spec.opacity,
      selectable: false,
      evented: false,
    }));
  }
  return objs;
}

// ── Scene build ───────────────────────────────────────────────────────────────

async function buildScene(f: FabricNS, canvas: Canvas, result: CanvasSpecResult) {
  // Pre-load semua gambar dulu agar object bisa dibuat sinkron sesuai z-order
  const urls = [...new Set(result.specs.filter((s) => s.kind === "image").map((s) => (s as ImageSpec).url))];
  const loaded = new Map(await Promise.all(
    urls.map(async (u) => [u, await loadImageElement(u)] as const),
  ));

  canvas.clear();
  for (const spec of result.specs) {
    switch (spec.kind) {
      case "rect":
        canvas.add(makeRect(f, spec));
        break;
      case "image": {
        const el = loaded.get(spec.url);
        if (el) canvas.add(makeImage(f, spec, el));
        break;
      }
      case "text":
        canvas.add(makeText(f, spec));
        break;
      case "group":
        canvas.add(...makeGroupObjects(f, spec));
        break;
      case "footer": {
        const objs = makeFooterObjects(f, spec);
        if (objs.length) canvas.add(...objs);
        break;
      }
    }
  }
  canvas.renderAll();
}

// ── Component ─────────────────────────────────────────────────────────────────

const TemplateFabricCanvas = forwardRef<
  TemplateFabricCanvasHandle,
  { spec: CanvasSpecResult; zoom?: number; onReady?: () => void }
>(({ spec, zoom = 0.55, onReady }, ref) => {
  const elRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const fabricRef = useRef<FabricNS | null>(null);
  const buildTokenRef = useRef(0);
  const readyFiredRef = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useImperativeHandle(ref, () => ({
    exportPng: () =>
      new Promise<Blob | null>((resolve) => {
        const c = canvasRef.current;
        if (!c) return resolve(null);
        // Sembunyikan gambar non-CORS lalu render ulang ke canvas baru yang bersih —
        // canvas display bisa saja sudah tainted sehingga toBlob langsung akan gagal
        const noCors = c.getObjects().filter((o) => (o as unknown as { aigtNoCors?: boolean }).aigtNoCors);
        noCors.forEach((o) => o.set({ visible: false }));
        try {
          const clean = c.toCanvasElement();
          clean.toBlob((blob) => resolve(blob), "image/png", 1);
        } catch {
          resolve(null);
        } finally {
          noCors.forEach((o) => o.set({ visible: true }));
          c.renderAll();
        }
      }),
  }));

  /* Init sekali; rebuild scene setiap spec berubah */
  useEffect(() => {
    let alive = true;
    const token = ++buildTokenRef.current;

    import("fabric").then(async (f) => {
      if (!alive || !elRef.current) return;
      fabricRef.current = f;

      if (!canvasRef.current) {
        canvasRef.current = new f.Canvas(elRef.current, {
          width: spec.width,
          height: spec.height,
          selection: false,
          renderOnAddRemove: false,
        });
      } else if (
        canvasRef.current.getWidth() !== spec.width ||
        canvasRef.current.getHeight() !== spec.height
      ) {
        canvasRef.current.setDimensions({ width: spec.width, height: spec.height });
      }

      // Tunggu webfont siap agar pengukuran teks (wrap/stack group) akurat
      try { await document.fonts.ready; } catch { /* lanjut dengan fallback font */ }
      if (!alive || token !== buildTokenRef.current) return;

      await buildScene(f, canvasRef.current, spec);
      if (!alive || token !== buildTokenRef.current) return;

      if (!readyFiredRef.current) {
        readyFiredRef.current = true;
        onReadyRef.current?.();
      }
    });

    return () => { alive = false; };
  }, [spec]);

  /* Dispose saat unmount */
  useEffect(() => {
    return () => {
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
  }, []);

  const displayScale = (zoom * DISPLAY_BASE_WIDTH) / spec.width;

  return (
    <div
      style={{
        width: Math.round(spec.width * displayScale),
        height: Math.round(spec.height * displayScale),
        overflow: "hidden",
        position: "relative",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 8px 40px rgba(0,0,0,.16)",
        flexShrink: 0,
        transition: "width .15s ease, height .15s ease",
      }}
    >
      <div
        style={{
          transform: `scale(${displayScale})`,
          transformOrigin: "top left",
          width: spec.width,
          height: spec.height,
        }}
      >
        <canvas ref={elRef} />
      </div>
    </div>
  );
});
TemplateFabricCanvas.displayName = "TemplateFabricCanvas";
export default TemplateFabricCanvas;
