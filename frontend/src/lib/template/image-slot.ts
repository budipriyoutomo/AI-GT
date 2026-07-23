import { resolveAssetUrl } from "@/lib/assetUrl";
import type { TemplateConfig, TemplateElement } from "@/types/template";

/**
 * Slot gambar konten user (image_source = "upload").
 *
 * Template Integrity: gambar user TIDAK pernah ditulis balik ke `template_config`.
 * Modul ini hanya MEMBACA config untuk menentukan di mana gambar boleh muncul —
 * hasilnya dipakai resolver, dan kedua renderer sekadar menggambar.
 */

export type ImageSlot =
  /** Elemen `image` top-level (path = index di `elements`). */
  | { kind: "element"; path: number[] }
  /** Latar full-bleed (`background.type: "image"`). */
  | { kind: "background" };

export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Posisi default layer bebas — dipakai HANYA saat template tak punya slot gambar.
 * Konstanta bersama supaya CSS renderer dan Fabric menaruhnya di tempat yang sama;
 * kalau tidak, preview dan hasil export PNG diam-diam berbeda.
 */
export const USER_IMAGE_OVERLAY_RECT: OverlayRect = { x: 0.2, y: 0.34, width: 0.6, height: 0.32 };

/** Elemen `image` yang menampung foto konten. `logo` sengaja tidak dihitung — itu data brand. */
function isContentImage(el: TemplateElement): boolean {
  return el.type === "image" && el.source !== "brand";
}

/**
 * Baca `template_config` dan tentukan slot gambar yang tersedia.
 *
 * Elemen foreground menang atas background: kalau template menyediakan bingkai foto
 * khusus, itu yang dimaksud desainer, bukan menimpa seluruh latar.
 *
 * Pencarian sengaja TIDAK menembus `group` — `group` hanya mengalirkan teks secara
 * vertikal dan CSS renderer tak menggambar `image` di dalamnya, jadi slot nested akan
 * tampil di canvas tapi hilang di preview. Template semacam itu jatuh ke layer bebas,
 * yang dirender kedua renderer.
 */
export function findImageSlot(config: TemplateConfig): ImageSlot | null {
  const index = (config.elements ?? []).findIndex(isContentImage);
  if (index >= 0) return { kind: "element", path: [index] };
  if (config.background?.type === "image") return { kind: "background" };
  return null;
}

export interface ResolvedUserImage {
  /** URL siap-load (absolut). null = tidak ada gambar user. */
  url: string | null;
  /** Slot template yang ditimpa gambar user. null = tidak ada slot. */
  slot: ImageSlot | null;
  /** Rect layer bebas, diisi HANYA saat ada gambar tapi template tak punya slot. */
  overlay: OverlayRect | null;
}

export function resolveUserImage(
  config: TemplateConfig,
  userImageUrl: string | null | undefined,
  /** Rect layer bebas hasil geser/resize user (final_config.user_image_rect). */
  savedRect?: OverlayRect | null,
): ResolvedUserImage {
  const url = resolveAssetUrl(userImageUrl ?? null);
  if (!url) return { url: null, slot: null, overlay: null };

  const slot = findImageSlot(config);
  // Slot template = geometri milik desainer (Layout & komposisi terkunci) —
  // rect tersimpan hanya berlaku untuk layer bebas.
  return { url, slot, overlay: slot ? null : (savedRect ?? USER_IMAGE_OVERLAY_RECT) };
}
