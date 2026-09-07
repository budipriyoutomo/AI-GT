import { describe, expect, it } from "vitest";

import { USER_IMAGE_OVERLAY_RECT, findImageSlot, resolveUserImage } from "../image-slot";
import type { TemplateConfig } from "@/types/template";

const SCHEME = { accent: "#f00", primary: "#fff", secondary: "#000" };

function config(partial: Partial<TemplateConfig>): TemplateConfig {
  return { color_scheme: SCHEME, elements: [], ...partial } as TemplateConfig;
}

describe("findImageSlot", () => {
  it("finds a foreground image element", () => {
    const cfg = config({
      elements: [
        { type: "text", x: 0, y: 0, width: 1, value: "hi" },
        { type: "image", source: "thumbnail", x: 0.1, y: 0.2, width: 0.8, height: 0.4 },
      ],
    });
    expect(findImageSlot(cfg)).toEqual({ kind: "element", path: [1] });
  });

  it("ignores an image nested inside a group — `group` hanya mengalirkan teks, dan CSS renderer tidak menggambar image di dalamnya; mengklaimnya sebagai slot bikin preview dan export berbeda", () => {
    const cfg = config({
      background: { type: "color", value: "#fff" },
      elements: [
        {
          type: "group",
          x: 0,
          y: 0,
          width: 1,
          children: [
            { type: "text", x: 0, y: 0, width: 1, value: "hi" },
            { type: "image", source: "thematic", x: 0, y: 0, width: 1, height: 0.3 },
          ],
        },
      ],
    });
    expect(findImageSlot(cfg)).toBeNull();
  });

  it("falls back to a full-bleed image background", () => {
    const cfg = config({
      background: { type: "image", source: "background", fallback: "#111" },
      elements: [{ type: "text", x: 0, y: 0, width: 1, value: "hi" }],
    });
    expect(findImageSlot(cfg)).toEqual({ kind: "background" });
  });

  it("prefers the foreground element over an image background", () => {
    const cfg = config({
      background: { type: "image", source: "background", fallback: "#111" },
      elements: [{ type: "image", source: "thumbnail", x: 0, y: 0, width: 1, height: 0.4 }],
    });
    expect(findImageSlot(cfg)).toEqual({ kind: "element", path: [0] });
  });

  it("returns null when the template has no image slot at all", () => {
    const cfg = config({
      background: { type: "color", value: "#fff" },
      elements: [{ type: "text", x: 0, y: 0, width: 1, value: "hi" }],
    });
    expect(findImageSlot(cfg)).toBeNull();
  });

  it("ignores logo elements — logo is brand data, not a content image slot", () => {
    const cfg = config({
      elements: [{ type: "logo", source: "brand", x: 0, y: 0, width: 0.2, height: 0.08 }],
    });
    expect(findImageSlot(cfg)).toBeNull();
  });
});

describe("resolveUserImage", () => {
  const withSlot = config({
    elements: [{ type: "image", source: "thumbnail", x: 0, y: 0, width: 1, height: 0.4 }],
  });
  const withoutSlot = config({
    background: { type: "color", value: "#fff" },
    elements: [{ type: "text", x: 0, y: 0, width: 1, value: "hi" }],
  });

  it("returns nothing when the user has no image", () => {
    expect(resolveUserImage(withSlot, null)).toEqual({ url: null, slot: null, overlay: null });
  });

  it("binds the image to the template slot when one exists", () => {
    const res = resolveUserImage(withSlot, "/permanent/uploads/u1/a.png");
    expect(res.slot).toEqual({ kind: "element", path: [0] });
    expect(res.overlay).toBeNull();
    expect(res.url).toContain("/permanent/uploads/u1/a.png");
  });

  it("falls back to a free overlay layer when the template has no slot", () => {
    const res = resolveUserImage(withoutSlot, "/permanent/uploads/u1/a.png");
    expect(res.slot).toBeNull();
    expect(res.overlay).toEqual(USER_IMAGE_OVERLAY_RECT);
  });

  it("keeps the overlay rect inside the canvas", () => {
    const { x, y, width, height } = USER_IMAGE_OVERLAY_RECT;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + width).toBeLessThanOrEqual(1);
    expect(y + height).toBeLessThanOrEqual(1);
  });
});

describe("resolveUserImage — posisi layer bebas tersimpan", () => {
  const noSlot = config({
    background: { type: "color", value: "#fff" },
    elements: [{ type: "text", x: 0, y: 0, width: 1, value: "hi" }],
  });
  const withSlot = config({
    elements: [{ type: "image", source: "thumbnail", x: 0, y: 0, width: 1, height: 0.4 }],
  });
  const SAVED = { x: 0.05, y: 0.6, width: 0.4, height: 0.25 };

  it("memakai rect tersimpan, bukan rect default", () => {
    const res = resolveUserImage(noSlot, "/permanent/uploads/u1/a.png", SAVED);
    expect(res.overlay).toEqual(SAVED);
  });

  it("tanpa rect tersimpan → rect default", () => {
    const res = resolveUserImage(noSlot, "/permanent/uploads/u1/a.png", null);
    expect(res.overlay).toEqual(USER_IMAGE_OVERLAY_RECT);
  });

  it("rect tersimpan diabaikan saat template punya slot — geometri slot milik template", () => {
    const res = resolveUserImage(withSlot, "/permanent/uploads/u1/a.png", SAVED);
    expect(res.slot).toEqual({ kind: "element", path: [0] });
    expect(res.overlay).toBeNull();
  });
});
