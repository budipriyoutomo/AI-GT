export interface CompanyContact {
  website: string;
  phone: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  hashtag: string;
  whatsapp: string;
  facebook: string;
  // Kolom `contact` di DB adalah JSON bebas, dan slot footer template bisa memakai
  // key lain (whatsapp/facebook/location/booking — lihat SocialIcon). Index signature
  // ini membuat contact dapat dibaca per-slot (contact[slot]) tanpa cast.
  [key: string]: string;
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
  /** Alamat bisnis — kolom tersendiri, bukan bagian dari `contact`. Mengisi slot footer
   *  `location` lewat buildFooterContact() saat template dirender branded. */
  address: string | null;
  contact: CompanyContact | null;
  language_preference: string;
  created_at: string;
  updated_at: string;
}
