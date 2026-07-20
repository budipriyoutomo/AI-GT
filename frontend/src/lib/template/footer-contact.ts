import type { CompanyContact } from "@/types/company-profile";

/** Kontak kosong — semua field yang bisa diisi user di Settings. */
export const EMPTY_CONTACT: CompanyContact = {
  website: "", phone: "", instagram: "", tiktok: "", youtube: "", hashtag: "", whatsapp: "", facebook: "",
};

/** Bagian company profile yang mengisi slot footer template. */
export interface FooterContactSource {
  contact?: CompanyContact | null;
  address?: string | null;
}

/**
 * Satu-satunya tempat `address` (kolom tersendiri) dipetakan ke slot footer `location`.
 *
 * Kedua renderer membaca `contact[slot]` — CSS lewat FooterElement, Fabric lewat
 * canvas-spec — jadi pemetaan wajib terjadi SEBELUM keduanya. Kalau tiap renderer
 * memetakan sendiri, preview dan PNG hasil export bisa beda diam-diam.
 *
 * Dipakai hanya untuk render; jangan pakai untuk mengisi form Settings — di sana
 * `contact` dan `address` tetap dua field terpisah sesuai bentuknya di database.
 */
export function buildFooterContact(src: FooterContactSource | null): CompanyContact | null {
  if (!src) return null;
  const { contact, address } = src;
  if (!contact && !address?.trim()) return null;
  return {
    ...EMPTY_CONTACT,
    ...(contact ?? {}),
    // Slot kosong dirender sebagai ikon tanpa teks, jadi address kosong sengaja tidak
    // menimpa — biarkan absen ketimbang mengisi string kosong.
    ...(address?.trim() ? { location: address } : {}),
  };
}
