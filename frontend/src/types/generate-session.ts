export interface GenerateVariant {
  id: string;
  variant_number: number;
  copy_data: {
    headline: string;
    body: string;
    cta: string;
  };
  typography_data: {
    headline_font: string;
    body_font: string;
    headline_size: number;
    body_size: number;
    letter_spacing: number;
  };
  thematic_image_url: string | null;
  is_selected: boolean;
}

export type SessionStatus = "processing" | "completed" | "failed";

export interface GenerateSession {
  id: string;
  template_id: string;
  status: SessionStatus;
  language_style: string;
  thematic_image_theme: string | null;
  campaign_data: Record<string, unknown> | null;
  expires_at: string;
  created_at: string;
  variants: GenerateVariant[];
}
