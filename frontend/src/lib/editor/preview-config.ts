import { resolveTemplateConfig } from "@/lib/template/resolve";
import type { BrandSource, ResolvedConfig } from "@/lib/template/resolve";
import type { CopyResult } from "./merge";
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
}

/** Konteks brand editor — final_config.brand_applied + company profile live. */
export interface EditorBrandState {
  profile: BrandSource | null;
  branded: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Font id di panel editor → family name (dipakai merge layer & canvas renderer)
const FONT_ID_TO_FAMILY: Record<string, string> = {
  syne: "Syne",
  inter: "Inter",
  georgia: "Georgia",
  mono: "Space Mono",
};

// Slider letterSpacing editor bekerja di ruang preview 800px; template di ruang 1080px.
const LETTER_SPACING_SCALE = 1080 / 800;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fontFamilyOf = (id: string): string => FONT_ID_TO_FAMILY[id] ?? id;

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
    });
  } catch {
    return null; // config lama/invalid — fallback ke canvas generik
  }

  const elements = state.cta ? resolved.elements : stripCtaElements(resolved.elements);
  return { ...resolved, elements };
}
