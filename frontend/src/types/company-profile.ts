export interface CompanyProfile {
  id: string;
  user_id: string;
  business_name: string;
  industry: string;
  logo_url: string | null;
  brand_colors: string[] | null;
  language_preference: string;
  created_at: string;
  updated_at: string;
}
