"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminOrdersPanel } from "@/components/admin/AdminOrdersPanel";

/** A-3 — verifikasi pembayaran transfer manual (pengganti scripts/confirm_payment.py). */
export default function AdminOrdersPage() {
  return (
    <AdminShell active="orders" title="Verifikasi Pembayaran">
      <AdminOrdersPanel />
    </AdminShell>
  );
}
