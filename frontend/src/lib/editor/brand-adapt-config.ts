import { adaptScheme, adaptBackground, adaptScrimGradient } from "@/lib/brandAdapt";
import type { ColorScheme, TemplateElement } from "@/types/template";
import type { ProjectTemplateConfig } from "@/types/project";

/**
 * Brand-adapt sebuah template_config untuk RENDER (read-only — tidak menyentuh
 * template_config asli di DB). Ini menyalin logika TemplateRenderer (galeri/preview)
 * ke jalur canvas editor supaya editor & export PNG cocok dengan preview branded:
 *
 *   - color_scheme  → adaptScheme (role kromatik ikut brand color)
 *   - background    → adaptBackground (hue brand / derive; image dibiarkan)
 *   - scrim.gradient → adaptScrimGradient (veil brand)
 *   - font          → role di font_brand_roles memakai brand_font
 *
 * Brand kosong → kembalikan cfg apa adanya (tampil pakai palet template asli).
 */
export function brandAdaptConfig(
  cfg: ProjectTemplateConfig,
  brandColors?: string[] | null,
  brandFont?: string | null,
): ProjectTemplateConfig {
  const hasBrand = !!brandColors && brandColors.length > 0;
  if (!hasBrand) return cfg;

  const brandTheme = cfg.brand_theme;
  const background = adaptBackground(cfg.background, brandColors, brandTheme);
  const scheme = adaptScheme(cfg.color_scheme ?? ({} as ColorScheme), brandColors, background, brandTheme);

  const fontRoles = new Set(brandTheme?.font_brand_roles ?? []);
  const useFont = brandFont || undefined;

  const adaptEl = (el: TemplateElement): TemplateElement => {
    let next = el;
    // Brand font hanya untuk role yang di-whitelist (kontrak README §5).
    if (useFont && el.role && fontRoles.has(el.role)) {
      next = { ...next, style: { ...(next.style ?? {}), fontFamily: useFont } };
    }
    if (el.type === "scrim" && el.gradient) {
      const g = adaptScrimGradient(el.gradient, brandColors, brandTheme);
      if (g) next = { ...next, gradient: g };
    }
    if (el.children?.length) {
      next = { ...next, children: el.children.map(adaptEl) };
    }
    return next;
  };

  return {
    ...cfg,
    background,
    color_scheme: scheme,
    elements: (cfg.elements ?? []).map(adaptEl),
  };
}
