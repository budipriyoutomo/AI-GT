/**
 * Auto-fit ukuran font: mengecilkan teks agar muat di ruang yang disediakan template.
 *
 * Kenapa perlu: elemen teks template diposisikan absolut (x/y tetap). Copy dari AI
 * panjangnya tak bisa ditebak — headline 1 baris di template bisa jadi 2-3 baris dan
 * menabrak elemen di bawahnya. Template hanya menyimpan fontSize IDEAL; renderer yang
 * menyesuaikan turun bila copy lebih panjang.
 *
 * Aturan: HANYA mengecilkan, tidak pernah memperbesar — ukuran template adalah batas
 * atas desain. Copy yang sudah muat dirender persis seperti yang di-author.
 *
 * PENTING — pembagian tugas dengan renderer:
 *   • Di mana teks membungkus  → ditentukan PENGUKUR (Fabric), bukan modul ini.
 *   • Apa arti "tinggi"        → ditentukan modul ini (`lines × fontSize × lineHeight`).
 *
 * Modul ini pernah punya word-wrap sendiri. Hasilnya beda tipis dari Fabric tepat di
 * ambang kolom: modul bilang 1 baris, Fabric menggambar 2, fitter tidak menyusut, dan
 * teks menabrak elemen di bawahnya. Wrap sekarang HANYA punya satu sumber kebenaran.
 */

/** Lebar & jumlah baris teks pada fontSize tertentu. Disuntik agar logika ini murni. */
export type MeasureBlock = (text: string, fontSize: number) => { width: number; lines: number };

/**
 * Tinggi blok teks. Sengaja memakai model CSS (`lines × fontSize × lineHeight`), BUKAN
 * `Textbox.height` milik Fabric yang menambah pengali leading-nya sendiri (~1.13×).
 * Budget di template digambar desainer dengan model CSS; memakai tinggi Fabric akan
 * membuat teks yang sebenarnya pas jadi ikut menyusut.
 */
export function blockHeight(lines: number, fontSize: number, lineHeight: number): number {
  return lines * fontSize * lineHeight;
}

export interface FitInput {
  text: string;
  maxWidth: number;
  maxHeight: number;
  fontSize: number;   // ukuran ideal dari template = batas atas
  lineHeight: number;
  minRatio?: number;  // lantai, relatif fontSize template (default 0.5)
}

/**
 * Ukuran font terbesar (≤ `fontSize`) yang membuat teks muat `maxWidth` × `maxHeight`.
 * Bila di lantai `minRatio` pun belum muat, lantai itu yang dikembalikan — lebih baik
 * sedikit luber daripada teks mengecil sampai tak terbaca.
 */
export function fitFontSize(input: FitInput, measure: MeasureBlock): number {
  const floor = Math.max(1, Math.round(input.fontSize * (input.minRatio ?? 0.5)));

  const fits = (size: number) => {
    const { width, lines } = measure(input.text, size);
    return width <= input.maxWidth && blockHeight(lines, size, input.lineHeight) <= input.maxHeight;
  };

  if (fits(input.fontSize)) return input.fontSize;

  // Ukuran bulat terbesar yang muat, di antara lantai dan ukuran template
  let lo = floor;
  let hi = Math.round(input.fontSize);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// ── Kapasitas karakter (perkiraan, untuk batas input & prompt) ────────────────

// Lebar glyph rata-rata ≈ 0.5em, margin aman 10% — HARUS sama dengan
// `_AVG_GLYPH_EM` / `_CHAR_MARGIN` di backend/app/services/providers/copy_prompt.py,
// supaya batas yang dilihat editor sama dengan yang diberikan ke AI.
const AVG_GLYPH_EM = 0.5;
const CHAR_MARGIN = 0.9;

/**
 * Perkiraan jumlah karakter yang muat di sebuah slot pada fontSize authored.
 * `null` bila slot tak punya batas bawah (anak group) → kapasitas tak tertentu.
 *
 * Perkiraan, bukan kebenaran: font lebar / huruf kapital mengukur beda. Cukup untuk
 * batas input & prompt; renderer tetap mengukur font sungguhan lewat `MeasureBlock`.
 */
export function charCapacity(slot: {
  width: number;
  fontSize: number;
  lineHeight: number;
  top: number;
  fitBottom?: number;
}): number | null {
  if (!slot.fitBottom) return null;
  const charsPerLine = Math.floor(slot.width / (slot.fontSize * AVG_GLYPH_EM));
  const budget = slot.fitBottom - slot.top;
  const lines = Math.max(1, Math.floor(budget / (slot.fontSize * slot.lineHeight)));
  const capacity = Math.floor(charsPerLine * lines * CHAR_MARGIN);
  return capacity > 0 ? capacity : null;
}
