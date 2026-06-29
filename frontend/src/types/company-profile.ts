export interface CompanyContact {
  website: string;
  phone: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  hashtag: string;
}

export interface CompanyProfile {
  id: string;
  user_id: string;
  business_name: string;
  industry: string;
  logo_url: string | null;
  brand_colors: string[] | null;
  brand_font: string | null;
  tagline: string | null;
  contact: CompanyContact | null;
  language_preference: string;
  created_at: string;
  updated_at: string;
}
