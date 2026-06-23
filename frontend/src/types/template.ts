export interface Template {
  id: string;
  name: string;
  industry: string;
  theme: string;
  content_type: string;
  thumbnail_url: string | null;
  template_config: Record<string, unknown>;
  is_premium: boolean;
  created_at: string;
}
