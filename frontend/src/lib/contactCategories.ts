/** Kategori form Hubungi Kami — dipakai form publik & kotak masuk admin (A-7). */
export const CONTACT_CATEGORIES = [
  { value: "support", label: "Dukungan Umum" },
  { value: "partnership", label: "Bisnis & Kemitraan" },
  { value: "privacy", label: "Privasi & Legal" },
];

export function contactCategoryLabel(value: string | null): string {
  if (!value) return "Tanpa kategori";
  return CONTACT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
