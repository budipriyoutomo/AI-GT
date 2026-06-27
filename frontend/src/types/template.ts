export interface PreviewZone {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  value: string;
  style: {
    fontSize: number | null;
    fontWeight: string | null;
    color: string | null;
    accentWords?: string | null;
    accentColor?: string | null;
  };
}

export interface PreviewFooterZone {
  x: number;
  y: number;
  width: number;
  height: number;
  slots: string[];
  style: {
    color: string;
    backgroundColor: string;
    opacity: number;
    fontSize: number;
  };
}

export interface PreviewConfig {
  color_scheme: {
    accent: string;
    primary: string;
    secondary: string;
    brand_color_role: string;
  };
  font_family: string;
  zones: {
    logo: { x: number; y: number; width: number; height: number };
    headline: PreviewZone | null;
    body: PreviewZone | null;
    cta: PreviewZone | null;
    footer: PreviewFooterZone;
  };
}

/**
 * Lightweight shape returned saat browse template list.
 * preview_config adalah subset dari template_config untuk render thumbnail overlay.
 */
export interface TemplateListItem {
  id: string;
  name: string;
  industry: string;
  theme: string;
  content_type: string;
  layout_type: string;
  thumbnail_url: string | null;
  is_premium: boolean;
  preview_config: PreviewConfig;
}

/**
 * Full template, termasuk `template_config`.
 * Hanya di-fetch saat user pilih satu template (single row).
 */
export interface Template extends TemplateListItem {
  template_config: Record<string, unknown>;
  created_at: string;
}
