import type { OrderStatus } from "@/api/adminApi";

export const ORDER_STATUS_META: Record<OrderStatus, { variant: "success" | "warning" | "destructive" | "secondary"; label: string }> = {
  awaiting_verification: { variant: "warning",     label: "Menunggu verifikasi" },
  pending:               { variant: "secondary",   label: "Belum bayar"         },
  paid:                  { variant: "success",     label: "Lunas"               },
  rejected:              { variant: "destructive", label: "Ditolak"             },
  expired:               { variant: "destructive", label: "Kadaluarsa"          },
};

/** Hanya status ini yang masih bisa disetujui/ditolak — selaras dengan backend `_REVIEWABLE`. */
export const REVIEWABLE: OrderStatus[] = ["pending", "awaiting_verification"];

export function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
