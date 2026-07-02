export interface ColorScheme {
  accent: string;
  primary: string;
  secondary: string;
  [role: string]: string;
}

export interface GradientStop {
  color: string;
  alpha: number;
  position: number;
}

export interface TemplateBackground {
  type: "color" | "gradient" | "image";
  value?: string;                 // color
  direction?: string;             // gradient linear
  shape?: "linear" | "radial";    // gradient (default linear)
  position?: string;              // gradient radial, mis. "50% 30%"
  stops?: string[];               // gradient (hex)
  source?: "thumbnail" | "background"; // image → "thumbnail"=templates.thumbnail_url, "background"=templates.background_url (foto latar terpisah). Kosong = "thumbnail" (legacy).
  fallback?: string;              // image → warna saat thumbnail/background kosong
}

export interface ElementStyle {
  fontSize?: number;              // ruang 1080px
  fontFamily?: string;            // override font per-elemen (mis. subtitle thin) → fallback ke font template
  weight?: string;
  color?: string;                 // hex atau role
  lineHeight?: number;
  letterSpacing?: number;         // ruang 1080px
  align?: string;
  accentWords?: string;           // substring yang ditonjolkan
  accentColor?: string;           // hex atau role
  accentWeight?: string;
  backgroundColor?: string;       // footer
  backgroundGradient?: string[];  // footer/box: gradient latar (hex/role). Menang atas backgroundColor
  backgroundGradientDirection?: string; // arah gradient latar; default "to right" (horizontal)
  opacity?: number;               // footer
  stroke?: { color: string; width: number };   // outline teks (width ruang 1080px)
  shadow?: string;                // CSS text-shadow
  fillGradient?: string[];        // glossy: gradient fill teks (hex, urut sesuai arah)
  fillGradientDirection?: string; // arah fillGradient teks; default "180deg" (vertikal), "to right" = horizontal
  // box treatment (mis. CTA button): teks jadi pill berlatar yang hug-content sesuai align
  background?: string;            // hex atau role → latar box. Aktifkan box bila diisi
  radius?: number;                // border-radius box (ruang 1080px)
  padding?: string;               // CSS padding box, mis. "0.4em 1.2em" (em ikut fontSize)
  rotate?: number;                // derajat miring blok teks; negatif = naik ke kanan (CCW)
  italic?: boolean;               // oblique letterform (faux-italic utk font tanpa face italic mis. Anton)
  skew?: number;                  // skewX derajat — miringkan GEOMETRI box (CTA jadi paralelogram italic)
  thickness?: number;             // rule: tebal garis (ruang 1080px)
}

export interface TemplateElement {
  type: "logo" | "text" | "footer" | "scrim" | "image" | "group" | "rule" | "tagline";
  x: number;
  y: number;
  width: number;
  height?: number;
  align?: string;
  // group: anak-anak mengalir vertikal dengan jarak tetap (proporsional walau teks pendek/panjang)
  anchor?: "top" | "bottom";
  gap?: number;                   // ruang 1080px
  children?: TemplateElement[];
  // text
  role?: string;
  bind?: string;
  value?: string;
  style?: ElementStyle;
  // logo / image
  source?: "brand" | "thumbnail" | "thematic" | "background";
  fit?: string;
  radius?: number;                // image: border-radius (ruang 1080px)
  // footer
  slots?: string[];
  // scrim
  gradient?: { direction: string; stops: GradientStop[] };
}

// Resep turunan warna untuk mode "derive" (lihat README §5).
export type DeriveRecipe = "base" | "tint" | "readable" | "on-image";

/**
 * Kontrak personalisasi brand per-template (render-time, read-only terhadap template_config).
 * - mode "tint": hanya role di `color_slots` yang di-brand; background & scrim LOCKED.
 * - mode "derive": seluruh palet diturunkan dari `brand_colors[source]` via `derive` recipes.
 */
export interface BrandTheme {
  mode?: "tint" | "derive";               // default "tint"
  color_slots?: Record<string, number>;   // tint: role → index brand_colors
  source?: number;                        // derive: index brand_colors baseline
  derive?: Record<string, DeriveRecipe>;  // derive: role (incl. "background") → recipe
  scrim?: boolean;                        // tint: opt-in brand veil pada scrim (template foto+scrim). Default lock.
  font_brand_roles?: string[];            // role teks yang boleh pakai brand_font
}

export interface TemplateConfig {
  canvas?: { aspect?: string; dimensions?: { width: number; height: number } };
  background?: TemplateBackground;
  color_scheme: ColorScheme;
  font?: { family?: string };
  brand_theme?: BrandTheme;
  elements: TemplateElement[];
}

/**
 * Item list template — sudah membawa template_config penuh agar galeri bisa live-render.
 */
export interface TemplateListItem {
  id: string;
  name: string;
  industry: string;
  theme: string;
  content_type: string;
  layout_type: string;
  thumbnail_url: string;
  background_url?: string | null;   // foto latar full-bleed (source:"background"); terpisah dari thumbnail_url (foreground/thumbnail)
  is_premium: boolean;
  template_config: TemplateConfig;
}

/**
 * Full template (single view) — sama dengan list item + created_at.
 */
export interface Template extends TemplateListItem {
  created_at: string;
}
