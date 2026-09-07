import { resolveTemplateConfig } from "@/lib/template/resolve";
import type { BrandSource, ResolvedConfig } from "@/lib/template/resolve";
import type { CopyResult } from "./merge";
import { normalizeFontFamily } from "@/lib/fonts";
import type { OverlayRect } from "@/lib/template/image-slot";
import type { ProjectTemplateConfig } from "@/types/project";
import type { TemplateConfig, TemplateElement } from "@/types/template";

// ── Public types ──────────────────────────────────────────────────────────────

/** State editor yang relevan untuk preview template (copy + typography). */
export interface EditorPreviewState {
  headline: string;
  body: string;
  cta: string | null;
  headlineFont: string;
  bodyFont: string;
  letterSpacing: number; // px ruang preview 800px
  headlineScale: number; // faktor skala ukuran headline relatif template (1 = default template)
  bodyScale: number;     // faktor skala ukuran body relatif template
  /** Gambar konten user; null/hidden → template pakai gambar bawaannya. */
  userImageUrl?: string | null;
  /** Posisi layer bebas gambar user; null = default resolver. */
  userImageRect?: OverlayRect | null;
  /** true = font DIPILIH user di editor (bukan warisan saran AI) → menang atas brand_font. */
  headlineFontManual?: boolean;
  bodyFontManual?: boolean;
}

/** Konteks brand editor — final_config.brand_applied + company profile live. */
export interface EditorBrandState {
  profile: BrandSource | null;
  branded: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Slider letterSpacing editor bekerja di ruang preview 800px; template di ruang 1080px.
const LETTER_SPACING_SCALE = 1080 / 800;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Editor lama menyimpan id font ("syne"); normalizeFontFamily memetakannya ke nama
// family. Nama family diteruskan apa adanya.
const fontFamilyOf = (value: string): string => normalizeFontFamily(value) ?? "Inter";

/** Hapus elemen ber-bind cta (rekursif) — dipakai saat CTA kosong/null. Ini fixup
 * editor-spesifik murni (UI state), BUKAN aturan resolve — makanya tetap di adapter
 * ini, bukan pindah ke lib/template/resolve.ts (lihat Handoff 8a §4.2). */
function stripCtaElements(elements: TemplateElement[]): TemplateElement[] {
  return elements
    .filter((el) => el.bind !== "cta")
    .map((el) =>
      el.children ? { ...el, children: stripCtaElements(el.children) } : el,
    );
}

/**
 * Skala ukuran font slot ber-bind (headline/body) relatif ukuran template. Default 1
 * (ukuran template). Auto-fit di canvas tetap membatasi ke budget layout, jadi menaikkan
 * ukuran tak akan menabrak elemen bawah — hanya melar sampai batas ruangnya.
 */
function scaleBoundFontSize(
  elements: TemplateElement[],
  headlineScale: number,
  bodyScale: number,
): TemplateElement[] {
  const scaleFor = (bind?: string) =>
    bind === "headline" ? headlineScale : bind === "body" ? bodyScale : 1;
  const walk = (els: TemplateElement[]): TemplateElement[] =>
    els.map((el) => {
      let next = el.children ? { ...el, children: walk(el.children) } : el;
      const s = scaleFor(el.bind);
      if (s !== 1 && next.style?.fontSize != null) {
        next = { ...next, style: { ...next.style, fontSize: next.style.fontSize * s } };
      }
      return next;
    });
  return walk(elements);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Bangun ResolvedConfig siap-render untuk canvas editor: state editor → CopyResult →
 * resolveTemplateConfig() (satu resolver, dipakai juga oleh preview HTML & Fabric —
 * Handoff 8a §3.2/§4.2). Adapter tipis: tidak resolve brand/font sendiri.
 *
 * Return null bila config tidak lengkap/tidak valid → pemanggil fallback ke
 * canvas generik (project lama tanpa template_config).
 */
export function buildEditorPreviewConfig(
  tplCfg: ProjectTemplateConfig | undefined,
  state: EditorPreviewState,
  brand: EditorBrandState,
): ResolvedConfig | null {
  if (!tplCfg?.elements?.length || !tplCfg.color_scheme) return null;
  const cfg = { ...tplCfg, elements: tplCfg.elements, color_scheme: tplCfg.color_scheme } as TemplateConfig;

  const copy: CopyResult = {
    copy: {
      headline: state.headline,
      body: state.body,
      cta: state.cta ?? "",
    },
    typography: {
      headline_font: fontFamilyOf(state.headlineFont),
      headline_size: 0, // diabaikan — fontSizeStrategy "template"
      body_font: fontFamilyOf(state.bodyFont),
      body_size: 0,
      letter_spacing: state.letterSpacing * LETTER_SPACING_SCALE,
    },
    image_prompt: "",
    image_source: "none",
    thematic_image_url: null,
  };

  let resolved: ResolvedConfig;
  try {
    resolved = resolveTemplateConfig({
      templateConfig: cfg,
      profile: brand.profile,
      branded: brand.branded,
      copy,
      userImageUrl: state.userImageUrl ?? null,
      userImageRect: state.userImageRect ?? null,
      fontOverrides: {
        headline: state.headlineFontManual ? fontFamilyOf(state.headlineFont) : null,
        body: state.bodyFontManual ? fontFamilyOf(state.bodyFont) : null,
      },
    });
  } catch {
    return null; // config lama/invalid — fallback ke canvas generik
  }

  let elements = scaleBoundFontSize(resolved.elements, state.headlineScale, state.bodyScale);
  if (!state.cta) elements = stripCtaElements(elements);

  return { ...resolved, elements };
}
