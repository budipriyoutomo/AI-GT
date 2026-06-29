"use client";

import { forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import type { Canvas, Rect, FabricText, Textbox, FabricImage } from "fabric";

/* ── Public interface ─────────────────────────────────────── */

export interface FabricCanvasHandle {
  exportPng: () => Promise<Blob | null>;
}

export interface CanvasContent {
  headline: string;
  body: string;
  cta: string | null;
  headlineFont: string;
  bodyFont: string;
  headlineSize: number;
  bodySize?: number;
  letterSpacing: number;
  accentColor: string;
  backgroundType?: "color" | "gradient";
  backgroundColor?: string;
  backgroundGradient?: string[];
  thematicImageUrl: string | null;
  thematicVisible: boolean;
}

/* ── Constants ────────────────────────────────────────────── */

const W = 800;
const H = 1000;
const DEFAULT_ZOOM = 0.55;

/* ── Helpers ──────────────────────────────────────────────── */

function fontFamily(id: string): string {
  const map: Record<string, string> = {
    georgia: "Georgia, serif",
    mono: "'Space Mono', monospace",
    syne: "'Syne', sans-serif",
    inter: "Inter, sans-serif",
  };
  return map[id] ?? "Inter, sans-serif";
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

/** Returns true if the hex color is perceptually dark (luminance < 0.45). */
function isBgDark(hex: string): boolean {
  const clean = hex.replace("#", "").slice(0, 6);
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.45;
}

/* ── Objects ref shape ────────────────────────────────────── */

interface CanvasObjs {
  canvas: Canvas | null;
  headline: Textbox | null;
  body: Textbox | null;
  ctaBg: Rect | null;
  ctaText: FabricText | null;
  thematic: FabricImage | Rect | null;
  strip: Rect | null;
}

/* ── Component ────────────────────────────────────────────── */

const FabricCanvas = forwardRef<FabricCanvasHandle, { content: CanvasContent; zoom?: number; onReady?: () => void }>(
  ({ content, zoom = DEFAULT_ZOOM, onReady }, ref) => {
    const elRef = useRef<HTMLCanvasElement>(null);
    const objRef = useRef<CanvasObjs>({
      canvas: null, headline: null, body: null,
      ctaBg: null, ctaText: null, thematic: null, strip: null,
    });
    const prevThematicUrlRef = useRef<string | null | undefined>(undefined);
    // Always call the latest onReady — init effect only runs once so we need the ref
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;

    useImperativeHandle(ref, () => ({
      exportPng: () =>
        new Promise<Blob | null>((resolve) => {
          const c = objRef.current.canvas;
          if (!c) return resolve(null);
          (c.getElement() as HTMLCanvasElement).toBlob(
            (blob) => resolve(blob),
            "image/png",
            1,
          );
        }),
    }));

    /* ── Init canvas once on mount ── */
    useEffect(() => {
      if (!elRef.current) return;
      let alive = true;

      import("fabric").then(({ Canvas, Rect, FabricText, Textbox, FabricImage, Gradient }) => {
        if (!alive || !elRef.current) return;

        const accent = content.accentColor || "#6366F1";

        // Determine background fill and text colors from template config
        const gradientColors = content.backgroundType === "gradient" && content.backgroundGradient?.length
          ? content.backgroundGradient
          : null;
        const solidColor = content.backgroundColor || "#F9FAFB";
        const firstBgColor = gradientColors ? gradientColors[0] : solidColor;
        const dark = isBgDark(firstBgColor);
        const headlineColor = dark ? "#FFFFFF" : "#111827";
        const bodyColor = dark ? "rgba(255,255,255,0.72)" : "#6B7280";

        const canvas = new Canvas(elRef.current, {
          width: W,
          height: H,
          selection: false,
          renderOnAddRemove: false,
        });
        objRef.current.canvas = canvas;

        /* Background */
        const bg = new Rect({
          left: 0, top: 0, width: W, height: H,
          selectable: false, evented: false,
        });
        if (gradientColors && gradientColors.length >= 2) {
          const grad = new Gradient({
            type: "linear",
            gradientUnits: "pixels",
            coords: { x1: 0, y1: 0, x2: 0, y2: H },
            colorStops: gradientColors.map((color, i, arr) => ({
              offset: arr.length > 1 ? i / (arr.length - 1) : 0,
              color,
            })),
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          bg.set("fill", grad as any);
        } else {
          bg.set("fill", solidColor);
        }

        /* Top gradient overlay (subtle depth) */
        const topBlock = new Rect({
          left: 0, top: 0, width: W, height: 520,
          fill: hexWithAlpha(accent, dark ? 0.04 : 0.08),
          selectable: false, evented: false,
        });

        /* Accent left strip */
        const strip = new Rect({
          left: 0, top: 0, width: 10, height: H,
          fill: accent,
          selectable: false, evented: false,
        });
        objRef.current.strip = strip;

        /* Thematic image placeholder */
        const thematicPlaceholder = new Rect({
          left: W - 260, top: 60,
          width: 210, height: 210,
          fill: hexWithAlpha(accent, 0.12),
          stroke: accent, strokeWidth: 2, strokeDashArray: [10, 8],
          rx: 24, ry: 24,
          selectable: false, evented: false,
          visible: content.thematicVisible,
        });
        objRef.current.thematic = thematicPlaceholder;

        /* Separator */
        const sep = new Rect({
          left: 32, top: 636, width: W - 64, height: 2,
          fill: hexWithAlpha(accent, dark ? 0.35 : 0.25),
          selectable: false, evented: false,
        });

        /* Kicker */
        const kicker = new FabricText("KICKER TEKS", {
          left: 36, top: 655,
          fontSize: 13, fontFamily: fontFamily(content.bodyFont),
          fontWeight: "700", fill: dark ? "#FFFFFF" : accent, charSpacing: 180,
          selectable: false, evented: false,
        });

        /* Headline */
        const headlineObj = new Textbox(content.headline || "Headline", {
          left: 36, top: 690,
          width: W - 72,
          fontSize: content.headlineSize || 32,
          fontFamily: fontFamily(content.headlineFont),
          fontWeight: "800", fill: headlineColor,
          charSpacing: content.letterSpacing * 40,
          selectable: false, evented: false,
        });
        objRef.current.headline = headlineObj;

        /* Body */
        const bodyObj = new Textbox(content.body || "", {
          left: 36, top: 840,
          width: W - 72,
          fontSize: content.bodySize || 15, fontFamily: fontFamily(content.bodyFont),
          fill: bodyColor, lineHeight: 1.55,
          selectable: false, evented: false,
        });
        objRef.current.body = bodyObj;

        /* CTA background */
        const ctaBg = new Rect({
          left: 36, top: 940, width: 240, height: 56,
          fill: accent, rx: 28, ry: 28,
          selectable: false, evented: false,
        });
        objRef.current.ctaBg = ctaBg;

        /* CTA text */
        const ctaText = new FabricText(content.cta || "Belanja Sekarang", {
          left: 36 + 120, top: 940 + 28,
          fontSize: 15, fontFamily: fontFamily("inter"),
          fontWeight: "700", fill: "#FFFFFF",
          originX: "center", originY: "center",
          selectable: false, evented: false,
        });
        objRef.current.ctaText = ctaText;

        // Initial CTA visibility — null means carousel content slide with no CTA
        const initialShowCta = content.cta !== null;
        ctaBg.set({ visible: initialShowCta });
        ctaText.set({ visible: initialShowCta });

        // Mark initial URL so sync effect doesn't double-load on first content change
        prevThematicUrlRef.current = content.thematicImageUrl;

        canvas.add(bg, topBlock, strip, thematicPlaceholder, sep, kicker, headlineObj, bodyObj, ctaBg, ctaText);
        canvas.renderAll();

        /* Load real thematic image if available, then signal ready */
        if (content.thematicImageUrl && content.thematicVisible) {
          FabricImage.fromURL(content.thematicImageUrl, { crossOrigin: "anonymous" })
            .then((img) => {
              if (!alive) return;
              img.scaleToWidth(210);
              img.scaleToHeight(210);
              img.set({ left: W - 260, top: 60, rx: 24, ry: 24, selectable: false, evented: false });
              canvas.remove(thematicPlaceholder);
              canvas.add(img);
              objRef.current.thematic = img;
              canvas.renderAll();
            })
            .catch(() => { /* keep placeholder on image load failure */ })
            .finally(() => { if (alive) onReadyRef.current?.(); });
        } else {
          onReadyRef.current?.();
        }
      });

      return () => {
        alive = false;
        objRef.current.canvas?.dispose();
        objRef.current.canvas = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Sync content changes to canvas objects ── */
    useEffect(() => {
      const { canvas, headline, body, ctaBg, ctaText, thematic } = objRef.current;
      if (!canvas) return;

      if (headline) {
        headline.set({
          text: content.headline || "Headline",
          fontSize: content.headlineSize,
          fontFamily: fontFamily(content.headlineFont),
          charSpacing: content.letterSpacing * 40,
        });
      }
      if (body) {
        body.set({
          text: content.body || "",
          fontFamily: fontFamily(content.bodyFont),
          fontSize: content.bodySize || 15,
        });
      }

      // CTA: null means carousel content slide with no CTA — hide button entirely
      const showCta = content.cta !== null;
      if (ctaBg) ctaBg.set({ visible: showCta });
      if (ctaText) ctaText.set({ text: content.cta || "Belanja Sekarang", visible: showCta });

      // Thematic image: reload canvas object whenever the URL changes
      const urlChanged = content.thematicImageUrl !== prevThematicUrlRef.current;
      if (urlChanged) {
        prevThematicUrlRef.current = content.thematicImageUrl;
        if (content.thematicImageUrl) {
          // Render text/CTA changes immediately, then update image asynchronously
          canvas.renderAll();
          import("fabric").then(({ FabricImage }) => {
            const c = objRef.current.canvas;
            if (!c) return;
            FabricImage.fromURL(content.thematicImageUrl!, { crossOrigin: "anonymous" })
              .then((img) => {
                const c2 = objRef.current.canvas;
                if (!c2) return;
                img.scaleToWidth(210);
                img.scaleToHeight(210);
                img.set({
                  left: W - 260, top: 60, rx: 24, ry: 24,
                  selectable: false, evented: false,
                  visible: content.thematicVisible,
                });
                const old = objRef.current.thematic;
                if (old) c2.remove(old);
                c2.add(img);
                objRef.current.thematic = img;
                c2.renderAll();
              })
              .catch(() => {
                const cur = objRef.current.thematic;
                if (cur) { cur.set({ visible: false }); objRef.current.canvas?.renderAll(); }
              });
          });
          return;
        }
        // URL cleared — hide thematic element
        if (thematic) thematic.set({ visible: false });
      } else {
        if (thematic) thematic.set({ visible: content.thematicVisible });
      }

      canvas.renderAll();
    }, [content]);

    return (
      <div
        style={{
          width: Math.round(W * zoom),
          height: Math.round(H * zoom),
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
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: W,
            height: H,
          }}
        >
          <canvas ref={elRef} />
        </div>
      </div>
    );
  },
);
FabricCanvas.displayName = "FabricCanvas";
export default FabricCanvas;
