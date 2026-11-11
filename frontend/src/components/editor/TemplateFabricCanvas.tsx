"use client";

import { forwardRef, useImperativeHandle, useEffect, useRef, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Canvas, FabricObject, Textbox } from "fabric";
import { ICONS } from "@/components/template/SocialIcon";
import { computeTextLayout, textBoxLayout } from "@/lib/editor/canvas-spec";
import { corsSafeAssetUrl } from "@/lib/assetUrl";
import { FONT_CSS_VAR } from "@/lib/fonts";
import type { MeasureBlock } from "@/lib/editor/fit-text";
import type {
  CanvasSpecResult,
  FooterSpec,
  GradientSpec,
  GroupSpec,
  ImageSpec,
  RectSpec,
  TextSpec,
} from "@/lib/editor/canvas-spec";
import type { OverlayRect } from "@/lib/template/image-slot";

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
function resolveFontStack(family: string): string {
  // Peta family → CSS var dari lib/fonts.ts — sama dengan yang dipakai renderer CSS,
  // supaya preview dan PNG export memakai font yang sama.
  const varName = FONT_CSS_VAR[family];
  if (varName && typeof window !== "undefined") {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (v) return v;
  }
  return `'${family}', sans-serif`;
}

// ── Auto-fit ──────────────────────────────────────────────────────────────────

/**
 * Pengukur berbasis Fabric: membangun Textbox sementara (tidak pernah ditambahkan ke
 * canvas) lalu membaca lebar & jumlah baris HASIL PEMBUNGKUSAN FABRIC SENDIRI.
 *
 * Wajib Fabric, bukan `measureText` di canvas terpisah: pembungkusnya harus persis
 * sama dengan yang menggambar. Estimasi sendiri meleset di ambang kolom → fitter
 * mengira teks muat 1 baris padahal digambar 2 baris, dan teks menabrak elemen bawah.
 */
function measurerFor(f: FabricNS, spec: TextSpec): MeasureBlock {
  const fontFamily = resolveFontStack(spec.fontFamily);
  // Binary search menyondir ukuran yang sama berulang; rebuild terjadi tiap ketikan.
  const cache = new Map<string, { width: number; lines: number }>();
  return (text, fontSize) => {
    const key = `${fontSize}|${text}`;
    const hit = cache.get(key);
    if (hit) return hit;

    const probe = new f.Textbox(text, {
      width: spec.width,
      fontSize,
      fontFamily,
      fontWeight: spec.fontWeight,
      fontStyle: spec.fontStyle ?? "normal",
      lineHeight: spec.lineHeight,
      charSpacing: spec.charSpacing ?? 0,
    });
    const measured = { width: probe.calcTextWidth(), lines: probe.textLines.length };
    cache.set(key, measured);
    return measured;
  };
}

// ── Footer social icons ─────────────────────────────────────────────────────────

// Render ikon footer (react-icons yang sama dengan SocialIcon) ke SVG data-URI supaya
// bisa digambar Fabric & ikut ter-export. `color` diteruskan sebagai currentColor →
// jalan untuk ikon fill (Simple Icons) maupun stroke (Lucide). Slot tak dikenal → null.
function footerIconUrl(slot: string, color: string, sizePx: number): string | null {
  const Ico = ICONS[slot];
  if (!Ico) return null;
  const svg = renderToStaticMarkup(createElement(Ico, { color, size: sizePx }));
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
  // Aset kita dimuat lewat proxy backend yang mengirim header CORS — CDN publik
  // tidak, dan tanpa CORS gambar akan dibuang dari PNG hasil export.
  const src = corsSafeAssetUrl(url) ?? url;
  const p = new Promise<LoadedImage | null>((resolve) => {
    // Coba CORS dulu (aman untuk export); gagal → load biasa agar tetap tampil,
    // objeknya ditandai dan disembunyikan sementara saat export.
    const tryLoad = (cors: boolean) => {
      const img = new Image();
      if (cors) img.crossOrigin = "anonymous";
      img.onload = () => resolve({ el: img, cors });
      img.onerror = () => (cors ? tryLoad(false) : resolve(null));
      img.src = src;
    };
    tryLoad(true);
  });
  imageElementCache.set(url, p);
  return p;
}

// ── Fabric object builders ────────────────────────────────────────────────────

type FabricNS = typeof import("fabric");

function makeGradient(f: FabricNS, g: GradientSpec) {
  return new f.Gradient({
    type: "linear",
    gradientUnits: "pixels",
    coords: g.coords,
    colorStops: g.stops.map((s) => ({ offset: s.offset, color: s.color })),
  });
}

function makeRect(f: FabricNS, spec: RectSpec) {
  // Rotasi (rule miring) berputar terhadap PUSAT rect — paritas transformOrigin:center
  // di TemplateRenderer. Origin center → left/top spec (sudut kiri-atas) digeser ke pusat.
  const rotated = spec.angle != null;
  const rect = new f.Rect({
    left: rotated ? spec.left + spec.width / 2 : spec.left,
    top: rotated ? spec.top + spec.height / 2 : spec.top,
    width: spec.width,
    height: spec.height,
    rx: spec.radius ?? 0,
    ry: spec.radius ?? 0,
    ...(rotated ? { originX: "center" as const, originY: "center" as const, angle: spec.angle } : {}),
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

function makeText(f: FabricNS, spec: TextSpec, fontSize = spec.fontSize): Textbox {
  const tb = new f.Textbox(spec.text, {
    left: spec.left,
    top: spec.top,
    width: spec.width,
    // charSpacing dalam 1/1000 em → ikut mengecil sendiri saat fontSize turun
    fontSize,
    fontFamily: resolveFontStack(spec.fontFamily),
    fontWeight: spec.fontWeight,
    fontStyle: spec.fontStyle ?? "normal",
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
      coords: spec.fillGradientCoords ?? { x1: 0, y1: 0, x2: 0, y2: 1 },
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
    // Hanya layer bebas gambar user yang boleh dipindah; sisanya geometri template.
    selectable: !!spec.interactive,
    evented: !!spec.interactive,
    hasControls: !!spec.interactive,
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
  
  const rotated = spec.angle != null || spec.skewX != null;
  if (rotated) {
    img.set({
      originX: "center", originY: "center",
      left: spec.left + spec.width / 2, top: spec.top + spec.height / 2,
      angle: spec.angle ?? 0, skewX: spec.skewX ?? 0,
    });
    if (img.clipPath) {
      img.clipPath.set({
        originX: "center", originY: "center",
        left: spec.left + spec.width / 2, top: spec.top + spec.height / 2,
        angle: spec.angle ?? 0, skewX: spec.skewX ?? 0,
      });
    }
  }
  
  // Gambar non-CORS: tampil di editor, tapi harus disembunyikan saat export
  // supaya canvas hasil export tidak tainted
  (img as unknown as { aigtNoCors?: boolean }).aigtNoCors = !cors;
  if (spec.interactive) {
    (img as unknown as { aigtUserImage?: boolean }).aigtUserImage = true;
  }
  return img;
}

// Teks + (opsional) box pill di belakangnya (CTA). Box hug-content: lebarnya ikut teks,
// posisinya tunduk pada textAlign — paritas <span inline-block> di TemplateRenderer.
// `top` = garis atas blok TERMASUK padding; `height` dipakai group untuk menumpuk anak berikutnya.
function makeTextObjects(
  f: FabricNS,
  spec: TextSpec,
  top = spec.top,
  fontSize = spec.fontSize,
): { objects: FabricObject[]; height: number } {
  // rotate/skew berputar terhadap PUSAT blok — paritas transformOrigin:center di TemplateRenderer.
  // Tinggi yang dilaporkan tetap tinggi TAK-terputar (CSS transform tak memengaruhi flow layout).
  const rotated = spec.angle != null || spec.skewX != null;

  const tb = makeText(f, spec, fontSize);
  if (!spec.box) {
    tb.set({ top });
    if (rotated) {
      const h = tb.height ?? 0;
      tb.set({
        originX: "center", originY: "center",
        left: spec.left + spec.width / 2,
        top: top + h / 2,
        angle: spec.angle ?? 0,
        skewX: spec.skewX ?? 0,
      });
    }
    return { objects: [tb], height: tb.height ?? 0 };
  }

  // padding em-relatif → ikut menyusut bila auto-fit mengecilkan fontSize
  const k = tb.fontSize / spec.fontSize;
  const box = { ...spec.box, padX: spec.box.padX * k, padY: spec.box.padY * k };

  // Ukur teks lewat Fabric (butuh font metrics), geometri box dihitung di layer spec
  const l = textBoxLayout(spec, box, tb.calcTextWidth(), tb.height ?? 0, top);
  tb.set({ left: l.textLeft, top: l.textTop });

  const pill = new f.Rect({
    left: l.boxLeft, top, width: l.boxW, height: l.boxH,
    rx: box.radius, ry: box.radius, fill: box.fill,
    selectable: false, evented: false,
  });

  if (rotated) {
    // pill + teks di-group agar berputar sebagai satu paralelogram terhadap pusat gabungan
    const group = new f.Group([pill, tb], { selectable: false, evented: false });
    const c = group.getCenterPoint();
    group.set({
      originX: "center", originY: "center",
      left: c.x, top: c.y,
      angle: spec.angle ?? 0,
      skewX: spec.skewX ?? 0,
    });
    group.setCoords();
    return { objects: [group], height: l.boxH };
  }
  return { objects: [pill, tb], height: l.boxH };
}

// Group: anak mengalir vertikal dengan gap tetap; anchor bottom = tumbuh ke atas
function makeGroupObjects(f: FabricNS, spec: GroupSpec) {
  // Dibangun relatif top=0 dulu — tinggi tiap anak (termasuk padding box) baru
  // diketahui setelah teks diukur, sedangkan anchor bottom butuh total tinggi.
  const parts = spec.children.map((c) => makeTextObjects(f, c, 0));
  const totalH =
    parts.reduce((a, p) => a + p.height, 0) + spec.gap * Math.max(parts.length - 1, 0);

  let y = spec.anchor === "bottom" ? spec.y - totalH : spec.y;
  const objects: FabricObject[] = [];
  for (const p of parts) {
    p.objects.forEach((o) => o.set({ top: (o.top ?? 0) + y }));
    objects.push(...p.objects);
    y += p.height + spec.gap;
  }
  return objects;
}

function makeFooterObjects(
  f: FabricNS,
  spec: FooterSpec,
  loaded: Map<string, LoadedImage | null>,
) {
  const objs: FabricObject[] = [];
  const hasBg = spec.backgroundGradient || (spec.backgroundColor && spec.backgroundColor !== "transparent");
  if (hasBg) {
    const bar = new f.Rect({
      left: spec.left, top: spec.top, width: spec.width, height: spec.height,
      opacity: spec.opacity,
      rx: spec.height / 2, ry: spec.height / 2,
      selectable: false, evented: false,
    });
    // Gradient menang atas warna solid (paritas TemplateRenderer)
    bar.set(
      "fill",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spec.backgroundGradient ? (makeGradient(f, spec.backgroundGradient) as any) : spec.backgroundColor,
    );
    objs.push(bar);
  }

  // Ikon + teks per slot, mengalir kiri→kanan (paritas flex-start di TemplateRenderer).
  // Ikon SELALU digambar; teks kontak menyusul bila ada. Skala/gap ikut fontSize.
  const cy = spec.top + spec.height / 2;
  const iconSize = spec.fontSize;
  const iconGap = spec.fontSize * 0.4;   // 0.4em antara ikon & teks
  const itemGap = spec.width * 0.025;    // 2.5% antar slot (paritas gap flex)
  let x = spec.left + spec.width * 0.03; // padding 0 3%

  for (const it of spec.items) {
    const url = footerIconUrl(it.slot, spec.color, iconSize);
    const icon = url ? loaded.get(url) : null;
    if (icon) {
      const scale = iconSize / (icon.el.naturalWidth || iconSize);
      const img = new f.FabricImage(icon.el, {
        left: x, top: cy, originY: "center",
        scaleX: scale, scaleY: scale,
        opacity: spec.opacity, selectable: false, evented: false,
      });
      (img as unknown as { aigtNoCors?: boolean }).aigtNoCors = !icon.cors;
      objs.push(img);
      x += iconSize + (it.text ? iconGap : 0);
    }
    if (it.text) {
      const txt = new f.FabricText(it.text, {
        left: x, top: cy, originY: "center",
        fontSize: spec.fontSize,
        fontFamily: resolveFontStack("Inter"),
        fill: spec.color, opacity: spec.opacity,
        selectable: false, evented: false,
      });
      objs.push(txt);
      x += txt.width ?? 0;
    }
    x += itemGap;
  }
  
  const rotated = spec.angle != null || spec.skewX != null;
  if (rotated) {
    const group = new f.Group(objs, { selectable: false, evented: false });
    const c = group.getCenterPoint();
    group.set({
      originX: "center", originY: "center",
      left: c.x, top: c.y,
      angle: spec.angle ?? 0,
      skewX: spec.skewX ?? 0,
    });
    group.setCoords();
    return [group];
  }
  
  return objs;
}

// ── Scene build ───────────────────────────────────────────────────────────────

async function buildScene(f: FabricNS, canvas: Canvas, result: CanvasSpecResult) {
  // Ikon footer adalah SVG data-URI (tanpa network) — aman di-preload karena
  // makeFooterObjects menggambarnya sinkron.
  const footerIconUrls = result.specs
    .filter((s): s is FooterSpec => s.kind === "footer")
    .flatMap((ft) => ft.items.map((it) => footerIconUrl(it.slot, ft.color, ft.fontSize)))
    .filter((u): u is string => !!u);
  const loaded = new Map(await Promise.all(
    [...new Set(footerIconUrls)].map(async (u) => [u, await loadImageElement(u)] as const),
  ));

  const textLayout = computeTextLayout(result.specs, (spec) => measurerFor(f, spec));

  // Gambar dari network TIDAK ditunggu di sini: teks & bentuk digambar duluan,
  // gambar menyusul di slot z-order yang sudah dipesan placeholder. Menunggu
  // semuanya bikin canvas kosong berdetik-detik saat load pertama.
  const pending: { spec: ImageSpec; placeholder: FabricObject }[] = [];

  canvas.clear();
  for (const spec of result.specs) {
    switch (spec.kind) {
      case "rect":
        canvas.add(makeRect(f, spec));
        break;
      case "image": {
        const placeholder = new f.Rect({
          left: spec.left, top: spec.top, width: spec.width, height: spec.height,
          fill: "transparent", visible: false, selectable: false, evented: false,
        });
        canvas.add(placeholder);
        pending.push({ spec, placeholder });
        break;
      }
      case "text": {
        const l = textLayout.get(spec.id);
        canvas.add(...makeTextObjects(f, spec, l?.top ?? spec.top, l?.fontSize ?? spec.fontSize).objects);
        break;
      }
      case "group":
        canvas.add(...makeGroupObjects(f, spec));
        break;
      case "footer": {
        const objs = makeFooterObjects(f, spec, loaded);
        if (objs.length) canvas.add(...objs);
        break;
      }
    }
  }
  canvas.renderAll(); // teks & bentuk sudah terlihat sebelum gambar tiba

  await Promise.all(pending.map(async ({ spec, placeholder }) => {
    const el = await loadImageElement(spec.url);
    const index = canvas.getObjects().indexOf(placeholder);
    if (index < 0) return; // scene sudah di-rebuild — hasil ini basi
    canvas.remove(placeholder);
    if (!el) return;
    const img = makeImage(f, spec, el);
    canvas.add(img);
    canvas.moveObjectTo(img, index);
  }));
  canvas.renderAll();
}

// ── Component ─────────────────────────────────────────────────────────────────

const TemplateFabricCanvas = forwardRef<
  TemplateFabricCanvasHandle,
  {
    spec: CanvasSpecResult;
    zoom?: number;
    onReady?: () => void;
    /** Dipanggil saat user selesai menggeser/resize layer bebas gambar. */
    onUserImageRectChange?: (rect: OverlayRect) => void;
  }
>(({ spec, zoom = 0.55, onReady, onUserImageRectChange }, ref) => {
  const elRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const fabricRef = useRef<FabricNS | null>(null);
  const buildTokenRef = useRef(0);
  const readyFiredRef = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onRectRef = useRef(onUserImageRectChange);
  onRectRef.current = onUserImageRectChange;

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
        // Posisi layer bebas dilaporkan dalam koordinat fraksional agar bebas dari
        // dimensi canvas — sama ruang dengan USER_IMAGE_OVERLAY_RECT.
        canvasRef.current.on("object:modified", (e) => {
          const obj = e.target as FabricObject & { aigtUserImage?: boolean };
          if (!obj?.aigtUserImage) return;
          const c = canvasRef.current!;
          onRectRef.current?.({
            x: (obj.left ?? 0) / c.getWidth(),
            y: (obj.top ?? 0) / c.getHeight(),
            width: (obj.width * (obj.scaleX ?? 1)) / c.getWidth(),
            height: (obj.height * (obj.scaleY ?? 1)) / c.getHeight(),
          });
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
