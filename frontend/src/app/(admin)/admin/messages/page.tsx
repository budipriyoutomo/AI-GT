"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminMessagesPanel } from "@/components/admin/AdminMessagesPanel";

/** A-7 — kotak masuk pesan dari halaman Hubungi Kami. */
export default function AdminMessagesPage() {
  return (
    <AdminShell active="messages" title="Kotak Masuk Pesan">
      <AdminMessagesPanel />
    </AdminShell>
  );
}
