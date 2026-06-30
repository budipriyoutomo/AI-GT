import type { ColorScheme, TemplateBackground, GradientStop, BrandTheme } from "@/types/template";

/**
 * Brand color adaptation untuk PREVIEW (read-only — tidak menyentuh template_config asli).
 *
 * Strategi: fidelity-first.
 * - Role netral (putih/hitam/abu) = struktural untuk keterbacaan → dipertahankan.
 * - Role kromatik = pembawa identitas → diganti brand color.
 * - Brand color dipakai apa adanya; lightness HANYA digeser bila kontras terhadap
 *   background di bawah ambang (contrast guard) supaya teks tetap terbaca.
 */

// ---------- color math ----------

interface RGB { r: number; g: number; b: number }
interface HSL { h: number; s: number; l: number }

function sanitizeHex(hex: string): string | null {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return /^[0-9a-fA-F]{6}$/.test(h) ? `#${h.toLowerCase()}` : null;
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RGB): string {
  const to = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }: HSL): RGB {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const hue = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 };
}

// Relative luminance (WCAG).
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(lumA: number, lumB: number): number {
  const hi = Math.max(lumA, lumB), lo = Math.min(lumA, lumB);
  return (hi + 0.05) / (lo + 0.05);
}

// Role netral: abu/putih/hitam → struktural (teks), jangan diutak-atik.
// Termasuk "tinted gray" (sedikit berwarna tapi pucat/gelap, mis. #CAD3DD).
function isNeutral(hex: string): boolean {
  const { s, l } = rgbToHsl(hexToRgb(hex));
  return s < 0.15 || l > 0.92 || l < 0.08 || (s < 0.3 && (l > 0.8 || l < 0.2));
}

// ---------- background luminance ----------

// Background TIDAK diubah saat brand adapt, jadi luminance-nya jadi acuan kontras teks.
function backgroundLuminance(bg?: TemplateBackground): number {
  if (!bg) return 0.05; // asumsi gelap
  if (bg.type === "color" && bg.value) {
    const h = sanitizeHex(bg.value);
    return h ? luminance(h) : 0.05;
  }
  if (bg.type === "gradient" && bg.stops?.length) {
    const lums = bg.stops.map(sanitizeHex).filter(Boolean).map((h) => luminance(h as string));
    if (lums.length) return lums.reduce((a, b) => a + b, 0) / lums.length;
  }
  // image → foto tak diketahui (sering gelap / dipasang scrim). Pakai fallback bila ada.
  if (bg.type === "image" && bg.fallback) {
    const h = sanitizeHex(bg.fallback);
    if (h) return luminance(h);
  }
  return 0.05;
}

// ---------- transforms ----------

// Geser lightness sambil pertahankan hue/saturasi (untuk varian & contrast guard).
function shiftLightness(hex: string, delta: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.l = Math.max(0, Math.min(1, hsl.l + delta));
  return rgbToHex(hslToRgb(hsl));
}

// Putar hue ke hue brand, pertahankan saturasi & lightness (untuk recolor background gradient).
function rotateHue(hex: string, targetH: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.h = targetH;
  return rgbToHex(hslToRgb(hsl));
}

// Hue brand bila cukup berwarna; null bila netral (abu/hitam/putih → tak ada hue bermakna).
function brandHue(hex: string): number | null {
  const { s } = rgbToHsl(hexToRgb(hex));
  return s < 0.1 ? null : rgbToHsl(hexToRgb(hex)).h;
}

function firstBrand(brandColors?: string[] | null): string | null {
  const brand = (brandColors ?? []).map(sanitizeHex).filter(Boolean) as string[];
  return brand[0] ?? null;
}

// Naikkan kontras terhadap background dengan menggeser lightness.
// Mulai dari warna brand asli (fidelity), koreksi hanya bila < minRatio.
// Coba kedua arah (terang & gelap) — di background mid-tone hanya satu arah yang bisa
// mencapai target — lalu pilih yang perubahannya paling kecil (fidelity maksimal).
function ensureContrast(hex: string, bgLum: number, minRatio: number): string {
  if (contrast(luminance(hex), bgLum) >= minRatio) return hex;

  const probe = (dir: number) => {
    let cur = hex;
    for (let i = 0; i < 22; i++) {
      cur = shiftLightness(cur, dir * 0.05);
      const c = contrast(luminance(cur), bgLum);
      const l = rgbToHsl(hexToRgb(cur)).l;
      if (c >= minRatio) return { hex: cur, ok: true, c };
      if (l <= 0.02 || l >= 0.98) return { hex: cur, ok: false, c };
    }
    return { hex: cur, ok: false, c: contrast(luminance(cur), bgLum) };
  };

  const dark = probe(-1);
  const light = probe(+1);
  const l0 = rgbToHsl(hexToRgb(hex)).l;
  const change = (h: string) => Math.abs(rgbToHsl(hexToRgb(h)).l - l0);

  if (dark.ok && light.ok) return change(dark.hex) <= change(light.hex) ? dark.hex : light.hex;
  if (dark.ok) return dark.hex;
  if (light.ok) return light.hex;
  // Tak ada yang capai target → ambil kontras terbaik yang bisa diraih.
  return dark.c >= light.c ? dark.hex : light.hex;
}

// ---------- main ----------

const MIN_CONTRAST = 3.0; // teks display besar (headline/CTA) — ambang WCAG large text.
const ROLE_PRIORITY = ["accent", "primary", "secondary"];

// Mode "tint" (README §5): HANYA role di color_slots yang di-brand; sisanya (termasuk
// background & scrim) LOCKED. Memetakan role → brand_colors[index]; slot hilang → fallback brand[0].
function adaptSchemeTint(
  scheme: ColorScheme,
  brand: string[],
  background: TemplateBackground | undefined,
  brandTheme: BrandTheme,
): ColorScheme {
  const slots = brandTheme.color_slots ?? {};
  const bgLum = backgroundLuminance(background);
  const result: ColorScheme = { ...scheme };

  for (const [role, idx] of Object.entries(slots)) {
    if (!(role in scheme)) continue;
    const picked = brand[idx] ?? brand[0];
    if (!picked) continue;
    // Jaga kontras tapi jangan turun di bawah yang dirancang designer (plafon MIN_CONTRAST).
    const origHex = sanitizeHex(scheme[role]);
    const origContrast = origHex ? contrast(luminance(origHex), bgLum) : MIN_CONTRAST;
    result[role] = ensureContrast(picked, bgLum, Math.min(MIN_CONTRAST, origContrast));
  }
  return result;
}

export function adaptScheme(
  scheme: ColorScheme,
  brandColors?: string[] | null,
  background?: TemplateBackground,
  brandTheme?: BrandTheme,
): ColorScheme {
  const brand = (brandColors ?? []).map(sanitizeHex).filter(Boolean) as string[];
  if (brand.length === 0) return scheme;

  // tint = kontrak per-template yang presisi. derive / tanpa brand_theme → heuristik global (legacy).
  if (brandTheme?.mode === "tint") return adaptSchemeTint(scheme, brand, background, brandTheme);

  const bgLum = backgroundLuminance(background);
  const result: ColorScheme = { ...scheme };

  // Urutkan role: prioritas dulu (accent→primary→secondary), lalu role lain.
  const keys = [
    ...ROLE_PRIORITY.filter((k) => k in scheme),
    ...Object.keys(scheme).filter((k) => !ROLE_PRIORITY.includes(k)),
  ];

  // Role kromatik (bukan netral) = pembawa identitas → terima brand color.
  const chromatic = keys.filter((k) => {
    const v = scheme[k];
    const hex = typeof v === "string" ? sanitizeHex(v) : null;
    return hex !== null && !isNeutral(hex);
  });

  chromatic.forEach((role, i) => {
    // brand[i] bila tersedia; kalau brand kurang, turunkan varian dari brand[0].
    let c = brand[i] ?? shiftLightness(brand[0], i % 2 === 1 ? +0.16 : -0.16);
    // Target kontras = relatif ke aslinya (jangan turun di bawah yang dirancang designer),
    // diplafon MIN_CONTRAST. Banyak template sengaja pakai kontras rendah + scrim/region,
    // jadi memaksa 3.0 absolut akan merusak fidelity warna brand.
    const origHex = sanitizeHex(scheme[role]);
    const origContrast = origHex ? contrast(luminance(origHex), bgLum) : MIN_CONTRAST;
    c = ensureContrast(c, bgLum, Math.min(MIN_CONTRAST, origContrast));
    result[role] = c;
  });

  return result;
}

/**
 * Recolor background gradient/solid ke hue brand (hue-rotation: pertahankan S & L,
 * jadi struktur terang/gelap untuk kontras teks tetap utuh). Background `image` =
 * foto user → TIDAK disentuh. Brand netral (tak ada hue) → kembalikan apa adanya.
 */
export function adaptBackground(
  background: TemplateBackground | undefined,
  brandColors?: string[] | null,
  brandTheme?: BrandTheme,
): TemplateBackground | undefined {
  // tint: background LOCKED — jaga identitas template (mis. cream retro tidak digeser ke hue brand).
  if (brandTheme?.mode === "tint") return background;
  const b0 = firstBrand(brandColors);
  if (!background || !b0) return background;
  const bh = brandHue(b0);
  if (bh === null) return background;

  if (background.type === "gradient" && background.stops?.length) {
    return {
      ...background,
      stops: background.stops.map((s) => {
        const hex = sanitizeHex(s);
        return hex ? rotateHue(hex, bh) : s;
      }),
    };
  }
  if (background.type === "color" && background.value) {
    const hex = sanitizeHex(background.value);
    return hex ? { ...background, value: rotateHue(hex, bh) } : background;
  }
  return background; // image → foto user, dibiarkan
}

/**
 * Recolor scrim (overlay di atas foto) jadi veil brand gelap: hue brand, lightness
 * rendah supaya tetap menggelapkan foto untuk keterbacaan teks. Alpha/posisi/arah
 * dipertahankan persis. Brand netral → scrim asli (hitam/navy) dibiarkan.
 */
export function adaptScrimGradient<T extends { stops: GradientStop[] }>(
  gradient: T | undefined,
  brandColors?: string[] | null,
  brandTheme?: BrandTheme,
): T | undefined {
  // tint: scrim LOCKED secara default; template foto+scrim bisa opt-in (brand_theme.scrim) untuk veil brand.
  if (brandTheme?.mode === "tint" && !brandTheme.scrim) return gradient;
  const b0 = firstBrand(brandColors);
  if (!gradient || !b0) return gradient;
  const hsl = rgbToHsl(hexToRgb(b0));
  if (hsl.s < 0.1) return gradient; // brand netral → biarkan scrim asli
  const veil = rgbToHex(hslToRgb({ h: hsl.h, s: Math.min(hsl.s, 0.65), l: 0.12 }));
  return { ...gradient, stops: gradient.stops.map((st) => ({ ...st, color: veil })) };
}
