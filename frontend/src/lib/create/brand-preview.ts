import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";

/**
 * Parse the `brandPreview` query param carried from the gallery modal toggle.
 * Absent or any non-"true" value → false (render template as-is), matching
 * the toggle's own default state in TemplatePreviewModal.
 */
export function parseBrandPreview(value: string | null): boolean {
  return value === "true";
}

/**
 * Resolve the brandColors to pass into TemplateRenderer.
 * - Preview disabled → null (original / unbranded render).
 * - Enabled + user has colors → user's colors.
 * - Enabled + user has none (null/empty) → fallback to the single canonical
 *   default (lib/defaults.ts), so branded preview never renders blank/errors.
 */
export function resolveBrandColors(
  userBrandColors: string[] | null | undefined,
  enabled: boolean,
): string[] | null {
  if (!enabled) return null;
  return userBrandColors && userBrandColors.length > 0
    ? userBrandColors
    : DEFAULT_COMPANY_PROFILE.brand_colors;
}

/**
 * Resolve the brandFont to pass into TemplateRenderer.
 * Empty string means "no font override" — no fallback needed for font.
 */
export function resolveBrandFont(
  userBrandFont: string | null | undefined,
  enabled: boolean,
): string | null {
  if (!enabled) return null;
  return userBrandFont || null;
}

/**
 * Resolve the logoUrl to pass into TemplateRenderer. Same "never blank" shape as
 * resolveBrandColors: `enabled` here is a raw query-string flag (not gated on whether
 * the user actually has a logo), so falling back to the canonical default keeps a
 * branded preview from silently rendering with no logo at all.
 */
export function resolveLogoUrl(
  userLogoUrl: string | null | undefined,
  enabled: boolean,
): string | null {
  if (!enabled) return null;
  return userLogoUrl ?? DEFAULT_COMPANY_PROFILE.logo_url;
}
