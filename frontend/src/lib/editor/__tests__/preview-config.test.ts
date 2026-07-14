import { describe, it, expect } from "vitest";
import { buildEditorPreviewConfig } from "../preview-config";
import type { EditorBrandState, EditorPreviewState } from "../preview-config";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";
import type { ProjectTemplateConfig } from "@/types/project";
import type { TemplateConfig, TemplateElement } from "@/types/template";

// ── Seed helpers ──────────────────────────────────────────────────────────────

function makeState(overrides: Partial<EditorPreviewState> = {}): EditorPreviewState {
  return {
    headline: "Kopi Gula Aren Premium",
    body: "Nikmati cita rasa kopi gula aren terbaik",
    cta: "Pesan Sekarang",
    headlineFont: "syne",
    bodyFont: "inter",
    letterSpacing: 0,
    ...overrides,
  };
}

const UNBRANDED: EditorBrandState = { profile: null, branded: false };

/** Wrapper: proyek lama (belum ada brand_applied) selalu memanggil dengan UNBRANDED. */
function build(tpl: ProjectTemplateConfig | undefined, state: EditorPreviewState, brand: EditorBrandState = UNBRANDED) {
  return buildEditorPreviewConfig(tpl, state, brand);
}

function makeTemplate(): ProjectTemplateConfig {
  return {
    canvas: { aspect: "4:5", dimensions: { width: 1080, height: 1350 } },
    color_scheme: { accent: "#F2C200", primary: "#FFFFFF", secondary: "#2E6B34" },
    font: { family: "Montserrat" },
    background: { type: "color", value: "#1A1A1A" },
    elements: [
      {
        type: "text",
        role: "eyebrow",
        x: 0.1, y: 0.18, width: 0.8,
        align: "center",
        value: "• HARI SUSHI INTERNASIONAL •",
        style: { fontSize: 32, weight: "700", color: "primary", letterSpacing: 6 },
      },
      {
        type: "text",
        role: "headline",
        bind: "headline",
        x: 0.1, y: 0.22, width: 0.8,
        value: "TEBUS\nMURAH",
        style: { fontSize: 142, weight: "800", color: "accent" },
      },
      {
        type: "text",
        role: "body",
        bind: "body",
        x: 0.1, y: 0.5, width: 0.8,
        value: "Body placeholder",
        style: { fontSize: 34, color: "secondary" },
      },
      {
        type: "group",
        x: 0.1, y: 0.9, width: 0.8,
        anchor: "bottom",
        gap: 20,
        children: [
          {
            type: "text",
            role: "cta",
            bind: "cta",
            x: 0, y: 0, width: 0.8,
            value: "CTA placeholder",
            style: { fontSize: 30, color: "accent" },
          },
        ],
      },
    ],
  };
}

function findByBind(cfg: TemplateConfig, bind: string): TemplateElement | undefined {
  const walk = (els: TemplateElement[]): TemplateElement | undefined => {
    for (const el of els) {
      if (el.bind === bind) return el;
      if (el.children) {
        const hit = walk(el.children);
        if (hit) return hit;
      }
    }
    return undefined;
  };
  return walk(cfg.elements);
}

function findByRole(cfg: TemplateConfig, role: string): TemplateElement | undefined {
  const walk = (els: TemplateElement[]): TemplateElement | undefined => {
    for (const el of els) {
      if (el.role === role) return el;
      if (el.children) {
        const hit = walk(el.children);
        if (hit) return hit;
      }
    }
    return undefined;
  };
  return walk(cfg.elements);
}

// ── Guard: config tidak lengkap → null (fallback ke canvas generik) ──────────

describe("buildEditorPreviewConfig — guard", () => {
  it("null bila template_config undefined", () => {
    expect(build(undefined, makeState())).toBeNull();
  });

  it("null bila elements kosong / tidak ada", () => {
    const tpl = makeTemplate();
    tpl.elements = [];
    expect(build(tpl, makeState())).toBeNull();

    delete tpl.elements;
    expect(build(tpl, makeState())).toBeNull();
  });

  it("null bila color_scheme tidak lengkap (merge schema menolak)", () => {
    const tpl = makeTemplate();
    tpl.color_scheme = { accent: "#FFF" } as ProjectTemplateConfig["color_scheme"];
    expect(build(tpl, makeState())).toBeNull();
  });
});

// ── Copy injection ────────────────────────────────────────────────────────────

describe("buildEditorPreviewConfig — copy", () => {
  it("mengisi headline/body/cta ke elemen ber-bind", () => {
    const out = build(makeTemplate(), makeState());
    expect(out).not.toBeNull();
    expect(findByBind(out!, "headline")?.value).toBe("Kopi Gula Aren Premium");
    expect(findByBind(out!, "body")?.value).toBe("Nikmati cita rasa kopi gula aren terbaik");
    expect(findByBind(out!, "cta")?.value).toBe("Pesan Sekarang");
  });

  it("elemen statis (tanpa bind) tidak berubah value-nya", () => {
    const out = build(makeTemplate(), makeState());
    expect(findByRole(out!, "eyebrow")?.value).toBe("• HARI SUSHI INTERNASIONAL •");
  });

  it("cta kosong → elemen ber-bind cta dihapus (termasuk di dalam group)", () => {
    const out = build(makeTemplate(), makeState({ cta: "" }));
    expect(findByBind(out!, "cta")).toBeUndefined();
    // headline/body tetap ada
    expect(findByBind(out!, "headline")).toBeDefined();
  });

  it("cta null (carousel content slide) → elemen cta dihapus", () => {
    const out = build(makeTemplate(), makeState({ cta: null }));
    expect(findByBind(out!, "cta")).toBeUndefined();
  });
});

// ── Typography ────────────────────────────────────────────────────────────────

describe("buildEditorPreviewConfig — typography", () => {
  it("map font id editor → family name (syne→Syne, mono→Space Mono)", () => {
    const out = build(
      makeTemplate(),
      makeState({ headlineFont: "syne", bodyFont: "mono" }),
    );
    expect(findByBind(out!, "headline")?.style?.fontFamily).toBe("Syne");
    expect(findByBind(out!, "body")?.style?.fontFamily).toBe("Space Mono");
  });

  it("font id tidak dikenal dianggap family name apa adanya", () => {
    const out = build(
      makeTemplate(),
      makeState({ headlineFont: "Playfair Display" }),
    );
    expect(findByBind(out!, "headline")?.style?.fontFamily).toBe("Playfair Display");
  });

  it("fontSize template dipertahankan (strategy template)", () => {
    const out = build(makeTemplate(), makeState());
    expect(findByBind(out!, "headline")?.style?.fontSize).toBe(142);
    expect(findByBind(out!, "body")?.style?.fontSize).toBe(34);
  });

  it("letterSpacing elemen statis dipertahankan; elemen ber-bind memakai nilai editor terskala 1080/800", () => {
    const out = build(makeTemplate(), makeState({ letterSpacing: 4 }));
    // statis: kicker tetap 6 (identitas template)
    expect(findByRole(out!, "eyebrow")?.style?.letterSpacing).toBe(6);
    // bound: 4 × (1080/800) = 5.4
    expect(findByBind(out!, "headline")?.style?.letterSpacing).toBeCloseTo(5.4);
  });
});

// ── Template integrity ────────────────────────────────────────────────────────

describe("buildEditorPreviewConfig — integrity", () => {
  it("tidak memodifikasi input template", () => {
    const tpl = makeTemplate();
    const snapshot = JSON.parse(JSON.stringify(tpl));
    build(tpl, makeState({ cta: "", letterSpacing: 8 }));
    expect(tpl).toEqual(snapshot);
  });

  it("background & color_scheme tidak berubah", () => {
    const out = build(makeTemplate(), makeState());
    expect(out!.background).toEqual({ type: "color", value: "#1A1A1A" });
    expect(out!.color_scheme).toEqual({ accent: "#F2C200", primary: "#FFFFFF", secondary: "#2E6B34" });
  });
});

// ── Brand (Handoff 8a §7 AC1/AC3/AC6 — satu resolver dipakai editor) ─────────

describe("buildEditorPreviewConfig — brand_applied", () => {
  it("branded=true + profile brand_colors → resolver dipanggil dengan branded=true (warna berubah)", () => {
    const brand: EditorBrandState = {
      profile: { logo_url: "/logos/u1.png", brand_colors: ["#0033CC"], brand_font: null, tagline: null },
      branded: true,
    };
    const out = build(makeTemplate(), makeState(), brand);
    expect(out!.color_scheme).not.toEqual({ accent: "#F2C200", primary: "#FFFFFF", secondary: "#2E6B34" });
    expect(out!.logoUrl).toBe("https://cdn.calira.my.id/logos/u1.png");
  });

  it("brand_applied absen (project lama) → diperlakukan false, tampilan tidak berubah", () => {
    const out = build(makeTemplate(), makeState());
    expect(out!.color_scheme).toEqual({ accent: "#F2C200", primary: "#FFFFFF", secondary: "#2E6B34" });
    expect(out!.logoUrl).toBe(DEFAULT_COMPANY_PROFILE.logo_url);
  });
});
