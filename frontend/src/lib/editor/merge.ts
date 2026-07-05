import type { TemplateConfig, TemplateElement, ElementStyle } from "@/types/template";
import { copyResultSchema, templateConfigSchema } from "./schemas";

// ── Public types ──────────────────────────────────────────────────────────────

export type ImageSource = "none" | "thematic" | "upload";

export type CopyBind = "headline" | "body" | "cta";

export type TextRole = "headline" | "body" | "cta" | (string & {});

export type MergeWarningCode =
  | "orphan-copy-field"
  | "empty-bound-copy"
  | "stale-accent-words"
  | "font-size-ignored";

export interface MergeWarning {
  code: MergeWarningCode;
  field: string;
  message: string;
}

/**
 * Controls how AI typography font size is applied to template elements.
 *
 *  'template'  — (default) keeps the canvas-space size from the template; AI size is
 *                discarded and logged as 'font-size-ignored'. Safe default: AI sizes
 *                (e.g. 36/16) are preview-space values that would break canvas layout
 *                if applied directly to a 1080px canvas (where sizes are e.g. 90/34).
 *  'ai'        — applies AI font size as-is.
 *  'ai-scaled' — multiplies AI size by fontSizeScale (default 1). Use this when AI
 *                preview sizes are known to scale linearly to canvas space.
 */
export type FontSizeStrategy = "template" | "ai" | "ai-scaled";

export interface MergeOptions {
  fontSizeStrategy?: FontSizeStrategy;
  fontSizeScale?: number;
}

export interface MergeResult {
  template: TemplateConfig;
  warnings: MergeWarning[];
}

export interface CopyResult {
  copy: { headline: string; body: string; cta: string };
  typography: {
    headline_font: string;
    headline_size: number;
    body_font: string;
    body_size: number;
    letter_spacing: number;
  };
  image_prompt: string;
  image_source: ImageSource;
  thematic_image_url: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COPY_BINDS: CopyBind[] = ["headline", "body", "cta"];

// ── Type guard ────────────────────────────────────────────────────────────────

function isCopyBind(bind: string): bind is CopyBind {
  return (COPY_BINDS as string[]).includes(bind);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Merges AI-generated copy into a template config, producing a new template
 * ready for canvas rendering. Pure function — neither input is mutated.
 *
 * Template Integrity is enforced: layout, background, color_scheme, scrim,
 * logo, footer, and element positions are never modified. Only text element
 * `value`, `fontFamily`, `letterSpacing`, `fontSize` (per strategy), and
 * `accentWords` reconciliation are touched.
 */
export function mergeCopyIntoTemplate(
  result: CopyResult,
  template: TemplateConfig,
  options: MergeOptions = {},
): MergeResult {
  copyResultSchema.parse(result);
  templateConfigSchema.parse(template);

  const { fontSizeStrategy = "template", fontSizeScale = 1 } = options;
  const warnings: MergeWarning[] = [];

  // Detect copy fields that have no matching bound element in the template
  const boundFields = collectBoundFields(template.elements);
  for (const field of COPY_BINDS) {
    if (result.copy[field] && !boundFields.has(field)) {
      warnings.push({
        code: "orphan-copy-field",
        field,
        message: `copy.${field} has no matching element with bind="${field}" in template`,
      });
    }
  }

  const processedElements = template.elements.map((el) =>
    processElement(el, result, template, fontSizeStrategy, fontSizeScale, warnings),
  );

  return {
    template: { ...template, elements: processedElements },
    warnings,
  };
}

// ── Element walking ───────────────────────────────────────────────────────────

function collectBoundFields(elements: TemplateElement[]): Set<string> {
  const fields = new Set<string>();
  for (const el of elements) {
    if (el.type === "text" && el.bind) fields.add(el.bind);
    if (el.children) {
      for (const f of collectBoundFields(el.children)) fields.add(f);
    }
  }
  return fields;
}

function processElement(
  el: TemplateElement,
  result: CopyResult,
  template: TemplateConfig,
  strategy: FontSizeStrategy,
  scale: number,
  warnings: MergeWarning[],
): TemplateElement {
  if (el.type === "text") {
    return processTextElement(el, result, template, strategy, scale, warnings);
  }
  if (el.type === "group" && el.children) {
    return {
      ...el,
      children: el.children.map((child) =>
        processElement(child, result, template, strategy, scale, warnings),
      ),
    };
  }
  // scrim / logo / footer / image — pass through locked
  return el;
}

function processTextElement(
  el: TemplateElement,
  result: CopyResult,
  template: TemplateConfig,
  strategy: FontSizeStrategy,
  scale: number,
  warnings: MergeWarning[],
): TemplateElement {
  const style: ElementStyle = { ...(el.style ?? {}) };
  let newValue = el.value;
  let valueChanged = false;

  // 1. Bind: fill value from copy[bind]
  if (el.bind && isCopyBind(el.bind)) {
    const copyValue = result.copy[el.bind];
    if (!copyValue) {
      warnings.push({
        code: "empty-bound-copy",
        field: el.bind,
        message: `copy.${el.bind} is empty; keeping template placeholder`,
      });
    } else {
      newValue = copyValue;
      valueChanged = true;
    }
  }

  // 2. Font family per role (brand override → AI role font → template default)
  style.fontFamily = resolveFontFamily(el.role, result, template);

  // 3. Letter spacing (applied to all text elements)
  style.letterSpacing = result.typography.letter_spacing;

  // 4. Font size per strategy (only for roles that map to an AI size)
  const aiSize = getAiSize(el.role, result);
  if (aiSize !== undefined) {
    if (strategy === "template") {
      if (style.fontSize !== undefined && aiSize !== style.fontSize) {
        warnings.push({
          code: "font-size-ignored",
          field: el.bind ?? el.role ?? "text",
          message: `fontSizeStrategy="template": AI size ${aiSize} ignored, keeping template size ${style.fontSize}`,
        });
      }
    } else if (strategy === "ai") {
      style.fontSize = aiSize;
    } else if (strategy === "ai-scaled") {
      style.fontSize = Math.round(aiSize * scale);
    }
  }

  // 5. Reconcile accentWords — only when a new value was successfully applied
  if (valueChanged && style.accentWords && newValue) {
    if (!newValue.includes(style.accentWords)) {
      warnings.push({
        code: "stale-accent-words",
        field: el.bind ?? el.role ?? "text",
        message: `accentWords "${style.accentWords}" not found in new text; removing accent`,
      });
      delete style.accentWords;
      delete style.accentColor;
      delete style.accentWeight;
    }
  }

  return { ...el, value: newValue, style };
}

// ── Typography helpers ────────────────────────────────────────────────────────

function resolveFontFamily(
  role: string | undefined,
  result: CopyResult,
  template: TemplateConfig,
): string {
  const brandTheme = template.brand_theme as Record<string, unknown> | undefined;
  const fontBrandRoles = (brandTheme?.font_brand_roles as string[] | undefined) ?? [];

  // Brand override: if role is flagged in font_brand_roles AND brand_font is set
  if (role && fontBrandRoles.includes(role) && typeof brandTheme?.brand_font === "string") {
    return brandTheme.brand_font;
  }

  if (role === "headline") return result.typography.headline_font;
  if (role === "body") return result.typography.body_font;

  return template.font?.family ?? "";
}

function getAiSize(role: string | undefined, result: CopyResult): number | undefined {
  if (role === "headline") return result.typography.headline_size;
  if (role === "body") return result.typography.body_size;
  return undefined;
}
