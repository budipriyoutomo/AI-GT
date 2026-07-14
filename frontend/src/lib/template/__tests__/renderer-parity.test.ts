import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { TemplateRenderer } from "@/components/template/TemplateRenderer";
import { buildCanvasSpec } from "@/lib/editor/canvas-spec";
import type { TextSpec } from "@/lib/editor/canvas-spec";
import { resolveTemplateConfig } from "../resolve";
import type { ResolvedConfig } from "../resolve";
import type { TemplateConfig } from "@/types/template";

/**
 * Paritas dua renderer (AGENTS.md §6, INTI Handoff 8a): TemplateRenderer (CSS) dan
 * canvas-spec (Fabric) HARUS menggambar warna/font/visibility identik untuk
 * ResolvedConfig yang sama — keduanya cuma menggambar, tidak resolve brand sendiri.
 * jsdom tidak punya canvas 2D → geometri (posisi/ukuran) tidak diuji di sini, hanya
 * properti yang tidak butuh font metrics: warna, fontFamily, visibility.
 */

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

const GOLDEN_TEMPLATE: TemplateConfig = {
  canvas: { aspect: "4:5", dimensions: { width: 1080, height: 1350 } },
  background: { type: "color", value: "#101010" },
  color_scheme: { accent: "#F2C200", primary: "#FFFFFF", secondary: "#2E6B34" },
  font: { family: "Inter" },
  brand_theme: {
    mode: "tint",
    color_slots: { accent: 0 },
    font_brand_roles: ["body"],
  },
  elements: [
    { type: "logo", x: 0.35, y: 0.03, width: 0.3, height: 0.1 },
    {
      type: "text",
      role: "headline",
      bind: "headline",
      x: 0.06, y: 0.2, width: 0.88,
      value: "Judul Promo",
      style: { fontSize: 90, color: "accent", weight: "800" },
    },
    {
      type: "text",
      role: "body",
      bind: "body",
      x: 0.06, y: 0.5, width: 0.88,
      value: "Deskripsi promo hari ini",
      style: { fontSize: 32, color: "primary" },
    },
  ],
};

function goldenResolved(branded: boolean): ResolvedConfig {
  return resolveTemplateConfig({
    templateConfig: GOLDEN_TEMPLATE,
    profile: { logo_url: "/logos/u1.png", brand_colors: ["#0033CC"], brand_font: "Poppins", tagline: null },
    branded,
  });
}

describe("paritas TemplateRenderer vs canvas-spec — warna", () => {
  it.each([[true], [false]])("branded=%s: warna headline & body identik di kedua renderer", (branded) => {
    const cfg = goldenResolved(branded);
    const { specs } = buildCanvasSpec({ cfg, thumbnailUrl: null, contact: {} });
    const headlineSpec = specs.find((s): s is TextSpec => s.kind === "text" && s.bind === "headline")!;
    const bodySpec = specs.find((s): s is TextSpec => s.kind === "text" && s.bind === "body")!;

    render(createElement(TemplateRenderer, { cfg, thumbnailUrl: "" }));
    const headlineEl = screen.getByText("Judul Promo");
    const bodyEl = screen.getByText("Deskripsi promo hari ini");

    expect(headlineEl.style.color).toBe(hexToRgb(headlineSpec.fill));
    expect(bodyEl.style.color).toBe(hexToRgb(bodySpec.fill));
  });

  it("branded=true → canvas-spec MEMUAT warna brand (regresi bug utama: canvas dulu tidak pernah lihat brand)", () => {
    const brandedCfg = goldenResolved(true);
    const unbrandedCfg = goldenResolved(false);
    const brandedSpecs = buildCanvasSpec({ cfg: brandedCfg, thumbnailUrl: null, contact: {} }).specs;
    const unbrandedSpecs = buildCanvasSpec({ cfg: unbrandedCfg, thumbnailUrl: null, contact: {} }).specs;

    const brandedHeadline = brandedSpecs.find((s): s is TextSpec => s.kind === "text" && s.bind === "headline")!;
    const unbrandedHeadline = unbrandedSpecs.find((s): s is TextSpec => s.kind === "text" && s.bind === "body")!;

    expect(brandedHeadline.fill).not.toBe("#F2C200"); // accent asli template
    expect(brandedHeadline.fill).not.toBe(unbrandedHeadline.fill);
  });
});

describe("paritas TemplateRenderer vs canvas-spec — font & visibility", () => {
  it("brand_font (role di font_brand_roles) sama-sama muncul di kedua renderer", () => {
    const cfg = goldenResolved(true);
    const { specs } = buildCanvasSpec({ cfg, thumbnailUrl: null, contact: {} });
    const bodySpec = specs.find((s): s is TextSpec => s.kind === "text" && s.bind === "body")!;
    expect(bodySpec.fontFamily).toBe("Poppins");

    render(createElement(TemplateRenderer, { cfg, thumbnailUrl: "" }));
    const bodyEl = screen.getByText("Deskripsi promo hari ini");
    // TemplateRenderer maps known family names to next/font CSS vars (FONT_STACK) —
    // "Poppins" specifically becomes var(--font-poppins), still traceable to the brand font.
    expect(bodyEl.style.fontFamily).toContain("--font-poppins");
  });

  it("logo tersembunyi (logoUrl null) → tidak ada img logo di kedua renderer; canvas-spec tidak menghasilkan spec logo", () => {
    const cfg = { ...goldenResolved(true), logoUrl: null };
    const { specs } = buildCanvasSpec({ cfg, thumbnailUrl: null, contact: {} });
    expect(specs.some((s) => s.kind === "image")).toBe(false);

    render(createElement(TemplateRenderer, { cfg, thumbnailUrl: "" }));
    expect(screen.queryByAltText("Logo bisnis")).not.toBeInTheDocument();
  });

  it("logo tampil (logoUrl set) → img logo muncul di kedua renderer", () => {
    const cfg = { ...goldenResolved(true), logoUrl: "/logos/u1.png" };
    const { specs } = buildCanvasSpec({ cfg, thumbnailUrl: null, contact: {} });
    expect(specs.some((s) => s.kind === "image")).toBe(true);

    render(createElement(TemplateRenderer, { cfg, thumbnailUrl: "" }));
    expect(screen.getByAltText("Logo bisnis")).toBeInTheDocument();
  });
});
