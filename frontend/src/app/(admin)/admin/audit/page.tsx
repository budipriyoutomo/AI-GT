"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminAuditPanel } from "@/components/admin/AdminAuditPanel";

/** A-9 — riwayat aksi admin (hanya baca). */
export default function AdminAuditPage() {
  return (
    <AdminShell active="audit" title="Audit Log">
      <AdminAuditPanel />
    </AdminShell>
  );
}
