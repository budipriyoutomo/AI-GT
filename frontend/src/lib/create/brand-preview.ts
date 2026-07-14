/**
 * Parse the `brandPreview` query param carried from the gallery modal toggle.
 * Absent or any non-"true" value → false (render template as-is), matching
 * the toggle's own default state in TemplatePreviewModal.
 */
export function parseBrandPreview(value: string | null): boolean {
  return value === "true";
}
