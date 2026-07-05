import { mergeCopyIntoTemplate } from "./merge";
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

/** Hapus elemen ber-bind cta (rekursif) — dipakai saat CTA kosong/null. */
function stripCtaElements(elements: TemplateElement[]): TemplateElement[] {
  return elements
    .filter((el) => el.bind !== "cta")
    .map((el) =>
      el.children ? { ...el, children: stripCtaElements(el.children) } : el,
    );
}

/**
 * merge.ts menerapkan letter_spacing ke SEMUA text element. Untuk fidelity preview,
 * elemen statis (tanpa bind) harus mempertahankan letterSpacing template — kicker
 * ber-tracking lebar jangan ikut nilai slider editor.
 */
function restoreStaticLetterSpacing(
  merged: TemplateElement[],
  original: TemplateElement[],
): TemplateElement[] {
  return merged.map((el, i) => {
    const orig = original[i];
    if (el.type === "group" && el.children && orig?.children) {
      return { ...el, children: restoreStaticLetterSpacing(el.children, orig.children) };
    }
    if (el.type !== "text" || el.bind) return el;
    const style = { ...(el.style ?? {}) };
    if (orig?.style?.letterSpacing !== undefined) style.letterSpacing = orig.style.letterSpacing;
    else delete style.letterSpacing;
    return { ...el, style };
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Bangun TemplateConfig siap-render untuk canvas editor: copy hasil edit di-merge
 * ke slot ber-bind (via mergeCopyIntoTemplate), font/letter-spacing editor diterapkan
 * per-role, dan elemen CTA dibuang bila CTA kosong.
 *
 * Return null bila config tidak lengkap/tidak valid → pemanggil fallback ke
 * canvas generik (project lama tanpa template_config).
 */
export function buildEditorPreviewConfig(
  tplCfg: ProjectTemplateConfig | undefined,
  state: EditorPreviewState,
): TemplateConfig | null {
  if (!tplCfg?.elements?.length || !tplCfg.color_scheme) return null;
  const cfg = { ...tplCfg, elements: tplCfg.elements, color_scheme: tplCfg.color_scheme } as TemplateConfig;

  const result: CopyResult = {
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

  let merged: TemplateConfig;
  try {
    merged = mergeCopyIntoTemplate(result, cfg, { fontSizeStrategy: "template" }).template;
  } catch {
    return null; // config lama/invalid — fallback ke canvas generik
  }

  let elements = restoreStaticLetterSpacing(merged.elements, cfg.elements);
  if (!state.cta) elements = stripCtaElements(elements);

  return { ...merged, elements };
}
