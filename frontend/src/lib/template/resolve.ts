import { adaptBackground, adaptScheme, adaptScrimGradient } from "@/lib/brandAdapt";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";
import { mergeCopyIntoTemplate } from "@/lib/editor/merge";
import type { CopyResult, MergeWarning } from "@/lib/editor/merge";
import type {
  BrandTheme,
  ColorScheme,
  TemplateBackground,
  TemplateConfig,
  TemplateElement,
} from "@/types/template";

/**
 * Satu resolver, dua renderer (Handoff 8a). Komposisi murni brandAdapt.ts (warna) +
 * merge.ts (copy & tipografi) + tabel precedence font (§3.3) + resolusi logo/tagline.
 * TemplateRenderer (CSS) dan canvas-spec (Fabric) HANYA menggambar ResolvedConfig —
 * tidak boleh resolve brand sendiri.
 */

// ── Public types ──────────────────────────────────────────────────────────────

/** Sumber data brand minimal yang dibutuhkan resolver — dipenuhi baik oleh
 * CompanyProfile (live, dari API) maupun DEFAULT_COMPANY_PROFILE (fallback unbranded). */
export interface BrandSource {
  logo_url?: string | null;
  brand_colors?: string[] | null;
  brand_font?: string | null;
  tagline?: string | null;
}

export interface ResolvedConfig {
  canvas?: TemplateConfig["canvas"];
  background?: TemplateBackground;
  color_scheme: ColorScheme;
  font?: TemplateConfig["font"];
  elements: TemplateElement[];
  logoUrl: string | null;
  warnings: MergeWarning[];
}

export interface ResolveTemplateConfigInput {
  templateConfig: TemplateConfig;
  /** Company profile milik user; null = belum ada / tidak dimuat. */
  profile: BrandSource | null;
  /** Toggle "Preview dengan brand color" / final_config.brand_applied. */
  branded: boolean;
  /** undefined = fase pre-generate (belum ada copy AI) — slot tetap placeholder template. */
  copy?: CopyResult;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function resolveTemplateConfig(input: ResolveTemplateConfigInput): ResolvedConfig {
  const { templateConfig, branded, copy } = input;
  const brandTheme = templateConfig.brand_theme;

  // §3.2 step 1 — pilih sumber profil.
  const activeProfile: BrandSource = branded ? (input.profile ?? {}) : DEFAULT_COMPANY_PROFILE;
  const brandColors = branded ? (activeProfile.brand_colors ?? null) : null;
  const brandFont = branded ? (activeProfile.brand_font ?? null) : null;
  const tagline = branded
    ? (activeProfile.tagline ?? null)
    : (DEFAULT_COMPANY_PROFILE.tagline || null);
  // Logo: branded → logo live user (null → hidden, kontrak Handoff 0 §4.7).
  // unbranded → logo default generik (bukan hidden — "logo default generik" §7 AC3).
  // resolveAssetUrl di sini (bukan di renderer): canvas-spec/Fabric butuh URL absolut
  // siap-load — tidak ada resolusi CDN lain di jalur Fabric. Idempoten untuk TemplateRenderer
  // (LogoElement-nya juga memanggil resolveAssetUrl; URL absolut dikembalikan apa adanya).
  const logoUrl = resolveAssetUrl(
    branded ? (activeProfile.logo_url ?? null) : (DEFAULT_COMPANY_PROFILE.logo_url ?? null),
  );

  // §3.2 step 2 — warna (background dulu, lalu scheme pakai bgLum background yang sudah teradaptasi).
  const background = adaptBackground(templateConfig.background, brandColors, brandTheme);
  const color_scheme = adaptScheme(
    templateConfig.color_scheme ?? ({} as ColorScheme),
    brandColors,
    background,
    brandTheme,
  );

  // §3.2 step 4 — copy & tipografi (ranks 3/4: AI font vs template font — merge.ts primitif, tak diubah).
  let elements = templateConfig.elements;
  let warnings: MergeWarning[] = [];
  if (copy) {
    const merged = mergeCopyIntoTemplate(copy, templateConfig, { fontSizeStrategy: "template" });
    elements = merged.template.elements;
    warnings = merged.warnings;
  }

  // §3.2 step 5 — precedence font (rank 2: brand_font), proteksi elemen statis, scrim, tagline.
  const fontBrandRoles = new Set(brandTheme?.font_brand_roles ?? []);
  elements = resolveElements(elements, templateConfig.elements, {
    brandColors,
    brandTheme,
    brandFont,
    fontBrandRoles,
    tagline,
  });

  return {
    canvas: templateConfig.canvas,
    background,
    color_scheme,
    font: templateConfig.font,
    elements,
    logoUrl,
    warnings,
  };
}

// ── Element pass: brand font, static-element protection, scrim, tagline ───────

interface ResolveCtx {
  brandColors: string[] | null;
  brandTheme?: BrandTheme;
  brandFont: string | null;
  fontBrandRoles: Set<string>;
  tagline: string | null;
}

function resolveElements(
  merged: TemplateElement[],
  original: TemplateElement[],
  ctx: ResolveCtx,
): TemplateElement[] {
  return merged.map((el, i) => {
    const orig = original[i];

    if (el.type === "group" && el.children && orig?.children) {
      return { ...el, children: resolveElements(el.children, orig.children, ctx) };
    }

    if (el.type === "scrim") {
      const gradient = adaptScrimGradient(el.gradient, ctx.brandColors, ctx.brandTheme);
      return gradient !== el.gradient ? { ...el, gradient } : el;
    }

    if (el.type === "tagline") {
      const value = ctx.tagline || el.value || "Tagline Perusahaan";
      return value !== el.value ? { ...el, value } : el;
    }

    if (el.type !== "text") return el;

    const style = { ...(el.style ?? {}) };
    let changed = false;

    // Proteksi elemen statis: letterSpacing kembali ke template — merge.ts menyapu rata
    // letter_spacing AI ke SEMUA text element, termasuk yang tanpa bind.
    if (!el.bind && orig) {
      if (orig.style?.letterSpacing !== undefined) style.letterSpacing = orig.style.letterSpacing;
      else delete style.letterSpacing;
      changed = true;
    }

    // Rank 2 (§3.3): brand_font menang atas font AI/template untuk role yang di-opt-in
    // template lewat font_brand_roles — berlaku baik untuk slot copy AI maupun elemen
    // statis yang sengaja di-flag template (mis. "terms"/"footnote" pada beberapa template).
    if (ctx.brandFont && el.role && ctx.fontBrandRoles.has(el.role)) {
      style.fontFamily = ctx.brandFont;
      changed = true;
    }

    return changed ? { ...el, style } : el;
  });
}
