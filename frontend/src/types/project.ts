import type { TemplateConfig, TemplateElement } from "@/types/template";

/**
 * Template config stored in project.final_config.template_config.
 * Contains the full template_config JSON from the template table, plus runtime-injected
 * fields (name, content_type, thumbnail_url) added by generate_service.
 */
export interface ProjectTemplateConfig extends Omit<TemplateConfig, "elements" | "color_scheme"> {
  // Override required fields to be optional (older project records may be missing them)
  color_scheme?: TemplateConfig["color_scheme"];
  elements?: TemplateElement[];
  // Runtime-injected by generate_service._normalize_template_config
  name?: string;
  content_type?: string;    // template platform type, e.g. "instagram_post" | "Carousel"
  slide_count?: number;
  layout?: string;
  thumbnail_url?: string | null;
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
  // Intent user "Preview dengan brand color" dibawa dari /create (Handoff 8a §3.4) —
  // absen di project lama = unbranded (backward compat, tidak mengubah tampilan lama).
  brand_applied?: boolean;
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
