export interface TemplateBackground {
  type: "color" | "gradient";
  value: string | string[];
}

export interface TemplateColorScheme {
  primary: string;
  secondary: string;
  accent: string;
}

export interface ProjectTemplateConfig {
  name?: string;
  content_type?: string;   // "Single" | "Carousel"
  slide_count?: number;
  background: TemplateBackground;
  color_scheme: TemplateColorScheme;
  layout?: string;
}

/* ── Carousel ── */

export interface CarouselSlide {
  slide_number: number;
  type: "cover" | "content" | "closing";
  headline: string;
  body: string;
  cta: string | null;
}

/**
 * Flat union — content_type discriminates at runtime.
 * Single:   { headline, body, cta }
 * Carousel: { content_type: "Carousel", slides: [...] }
 */
export interface ProjectCopy {
  content_type?: "Carousel";
  // Single fields
  headline?: string;
  body?: string;
  cta?: string | null;
  // Carousel fields
  slides?: CarouselSlide[];
}

/* ── Project ── */

export interface ProjectFinalConfig {
  copy: ProjectCopy;
  typography: {
    headline_font: string;
    body_font: string;
    headline_size: number;
    body_size: number;
    letter_spacing: number;
  };
  thematic_image_url: string | null;
  image_source: "upload" | "generated" | "none";
  image_prompt: string;
  template_config?: ProjectTemplateConfig;
}

export interface Project {
  id: string;
  user_id: string;
  session_id: string;
  variant_id: string;
  title: string;
  final_config: ProjectFinalConfig;
  exported_image_url: string | null;
  thumbnail_url: string | null;
  is_exported: boolean;
  created_at: string;
  updated_at: string;
}
