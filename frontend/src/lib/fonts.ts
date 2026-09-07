/**
 * Satu sumber daftar font untuk seluruh app.
 *
 * Dipakai bersama oleh Settings (font brand) dan editor (tab Tipografi) supaya
 * pilihan yang dilihat user sama di kedua tempat.
 *
 * Aturan: font yang muncul di `BRAND_FONT_OPTIONS` WAJIB punya entri di
 * `FONT_CSS_VAR` dan benar-benar dimuat `next/font` di `app/layout.tsx`. Font
 * yang tidak dimuat akan digambar Fabric memakai fallback sans-serif — preview
 * terlihat benar tapi PNG hasil export memakai font lain (dan pengukuran
 * auto-fit meleset karena metrik hurufnya berbeda).
 */

/** Font yang boleh dipilih user (Settings & editor). */
export const BRAND_FONT_OPTIONS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Plus Jakarta Sans",
  "Nunito",
  "Lato",
  "Roboto",
  "Open Sans",
  "Playfair Display",
] as const;

/** Font display milik template — tidak bisa dipilih user, tapi tetap harus dimuat. */
export const TEMPLATE_DISPLAY_FONTS = ["Anton", "Archivo Black"] as const;

/** Nama family → CSS variable yang dipasang next/font di layout. */
export const FONT_CSS_VAR: Record<string, string> = {
  Inter: "--font-inter",
  Poppins: "--font-poppins",
  Montserrat: "--font-montserrat",
  "Plus Jakarta Sans": "--font-plus-jakarta-sans",
  Nunito: "--font-nunito",
  Lato: "--font-lato",
  Roboto: "--font-roboto",
  "Open Sans": "--font-open-sans",
  "Playfair Display": "--font-playfair-display",
  Anton: "--font-anton",
  "Archivo Black": "--font-archivo-black",
};

/** Family yang dirender dengan fallback serif, bukan sans-serif. */
const SERIF_FAMILIES = new Set(["Playfair Display", "Georgia"]);

/**
 * Editor versi lama menyimpan id ("syne"), bukan nama family ("Syne"). Project
 * lama tetap harus render benar, jadi id-nya dipetakan saat dibaca.
 */
const LEGACY_FONT_ID_TO_FAMILY: Record<string, string> = {
  syne: "Syne",
  inter: "Inter",
  georgia: "Georgia",
  mono: "Space Mono",
};

/** id lama → family; nama family diteruskan apa adanya; kosong → null. */
export function normalizeFontFamily(value: string | null | undefined): string | null {
  if (!value) return null;
  return LEGACY_FONT_ID_TO_FAMILY[value] ?? value;
}

/** CSS font-family stack untuk sebuah family (dipakai renderer CSS). */
export function fontStackFor(family: string | null | undefined): string {
  const name = family || "Inter";
  const varName = FONT_CSS_VAR[name];
  const head = varName ? `var(${varName})` : `"${name}"`;
  const fallback = SERIF_FAMILIES.has(name) ? "serif" : "sans-serif";
  return `${head}, var(--font-inter), ${fallback}`;
}
