import { redirect } from "next/navigation";

/**
 * P1-1a — Campaign belum tersedia di MVP.
 * Halaman lama hanya mengumpulkan momen/arc lalu membuangnya; hasilnya identik
 * Quick Generate. Route dipertahankan sebagai redirect supaya tautan lama
 * (bookmark, riwayat browser) tidak jadi 404.
 */
export default function CampaignPage() {
  redirect("/create");
}
