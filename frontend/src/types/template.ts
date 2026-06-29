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
  source?: "thumbnail";           // image → templates.thumbnail_url
  fallback?: string;              // image → warna saat thumbnail kosong
}

export interface ElementStyle {
  fontSize?: number;              // ruang 1080px
  weight?: string;
  color?: string;                 // hex atau role
  lineHeight?: number;
  letterSpacing?: number;         // ruang 1080px
  align?: string;
  accentWords?: string;           // substring yang ditonjolkan
  accentColor?: string;           // hex atau role
  accentWeight?: string;
  backgroundColor?: string;       // footer
  opacity?: number;               // footer
  stroke?: { color: string; width: number };   // outline teks (width ruang 1080px)
  shadow?: string;                // CSS text-shadow
  fillGradient?: string[];        // glossy: gradient fill vertikal (hex top→bottom)
}

export interface TemplateElement {
  type: "logo" | "text" | "footer" | "scrim" | "image" | "group";
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
  source?: "brand" | "thumbnail" | "thematic";
  fit?: string;
  radius?: number;                // image: border-radius (ruang 1080px)
  // footer
  slots?: string[];
  // scrim
  gradient?: { direction: string; stops: GradientStop[] };
}

export interface TemplateConfig {
  canvas?: { aspect?: string; dimensions?: { width: number; height: number } };
  background?: TemplateBackground;
  color_scheme: ColorScheme;
  font?: { family?: string };
  brand_theme?: Record<string, unknown>;
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
  is_premium: boolean;
  template_config: TemplateConfig;
}

/**
 * Full template (single view) — sama dengan list item + created_at.
 */
export interface Template extends TemplateListItem {
  created_at: string;
}
