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
  cta: string;
  headlineFont: string;
  bodyFont: string;
  headlineSize: number;
  letterSpacing: number;
  accentColor: string;
  thematicImageUrl: string | null;
  thematicVisible: boolean;
}

/* ── Constants ────────────────────────────────────────────── */

const W = 800;
const H = 1000;
const DISPLAY_W = 360;
const SCALE = DISPLAY_W / W;

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
  // alpha 0..1 → last 2 hex digits
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
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

const FabricCanvas = forwardRef<FabricCanvasHandle, { content: CanvasContent }>(
  ({ content }, ref) => {
    const elRef = useRef<HTMLCanvasElement>(null);
    const objRef = useRef<CanvasObjs>({
      canvas: null, headline: null, body: null,
      ctaBg: null, ctaText: null, thematic: null, strip: null,
    });

    useImperativeHandle(ref, () => ({
      exportPng: () =>
        new Promise<Blob | null>((resolve) => {
          const c = objRef.current.canvas;
          if (!c) return resolve(null);
          // Export underlying HTML canvas at full resolution
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

      import("fabric").then(({ Canvas, Rect, FabricText, Textbox, FabricImage }) => {
        if (!alive || !elRef.current) return;

        const accent = content.accentColor || "#6366F1";

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
          fill: "#F9FAFB",
          selectable: false, evented: false,
        });

        /* Top gradient block */
        const topBlock = new Rect({
          left: 0, top: 0, width: W, height: 520,
          fill: hexWithAlpha(accent, 0.08),
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
          fill: hexWithAlpha(accent, 0.25),
          selectable: false, evented: false,
        });

        /* Kicker */
        const kicker = new FabricText("KICKER TEKS", {
          left: 36, top: 655,
          fontSize: 13, fontFamily: fontFamily(content.bodyFont),
          fontWeight: "700", fill: accent, charSpacing: 180,
          selectable: false, evented: false,
        });

        /* Headline */
        const headlineObj = new Textbox(content.headline || "Headline", {
          left: 36, top: 690,
          width: W - 72,
          fontSize: content.headlineSize || 32,
          fontFamily: fontFamily(content.headlineFont),
          fontWeight: "800", fill: "#111827",
          charSpacing: content.letterSpacing * 40,
          selectable: false, evented: false,
        });
        objRef.current.headline = headlineObj;

        /* Body */
        const bodyObj = new Textbox(content.body || "", {
          left: 36, top: 840,
          width: W - 72,
          fontSize: 15, fontFamily: fontFamily(content.bodyFont),
          fill: "#6B7280", lineHeight: 1.55,
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

        canvas.add(bg, topBlock, strip, thematicPlaceholder, sep, kicker, headlineObj, bodyObj, ctaBg, ctaText);
        canvas.renderAll();

        /* Load real thematic image if available */
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
            .catch(() => { /* keep placeholder on image load failure */ });
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
      const { canvas, headline, body, ctaText, thematic } = objRef.current;
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
        });
      }
      if (ctaText) ctaText.set({ text: content.cta || "Belanja Sekarang" });
      if (thematic) thematic.set({ visible: content.thematicVisible });

      canvas.renderAll();
    }, [content]);

    return (
      <div
        style={{
          width: DISPLAY_W,
          height: Math.round(DISPLAY_W * (H / W)),
          overflow: "hidden",
          position: "relative",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 8px 40px rgba(0,0,0,.16)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            transform: `scale(${SCALE})`,
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
