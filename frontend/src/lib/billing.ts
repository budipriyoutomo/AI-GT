import type { Plan } from "@/api/billingApi";

/** Format harga Rupiah — 0 atau kurang = "Gratis". */
export function fmtPrice(n: number): string {
  return n <= 0 ? "Gratis" : "Rp " + n.toLocaleString("id-ID");
}

/** Format tanggal ISO ke format Indonesia; null = "—". */
export function formatPlanDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export interface PlanFeature {
  label: string;
  ok: boolean;
}

/**
 * Daftar fitur satu paket — sumber tunggal untuk subscription, settings, dashboard.
 * `ok` menandai apakah fitur termasuk dalam paket.
 */
export function planFeatures(p: Plan): PlanFeature[] {
  return [
    { label: `${p.generate_limit} generate / bulan`, ok: true },
    {
      label: p.history_limit === -1 ? "Riwayat tidak terbatas" : `${p.history_limit} slot riwayat`,
      ok: true,
    },
    { label: `${p.profile_limit} profil bisnis`, ok: true },
    { label: "Thematic image AI", ok: p.thematic_image },
    { label: "Export tanpa watermark", ok: p.watermark_free },
    { label: "Priority support", ok: p.priority_support },
  ];
}
