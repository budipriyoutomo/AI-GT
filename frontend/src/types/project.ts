export interface ProjectFinalConfig {
  copy: {
    headline: string;
    body: string;
    cta: string;
  };
  typography: {
    headline_font: string;
    body_font: string;
    headline_size: number;
    body_size: number;
    letter_spacing: number;
  };
  thematic_image_url: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  session_id: string;
  variant_id: string;
  title: string;
  final_config: ProjectFinalConfig;
  exported_image_url: string | null;
  is_exported: boolean;
  created_at: string;
  updated_at: string;
}
