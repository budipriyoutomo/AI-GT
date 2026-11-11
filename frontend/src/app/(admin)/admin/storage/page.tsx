"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminStoragePanel } from "@/components/admin/AdminStoragePanel";

/** A-10 — status job terjadwal & pemakaian storage R2. */
export default function AdminStoragePage() {
  return (
    <AdminShell active="storage" title="Storage & Job">
      <AdminStoragePanel />
    </AdminShell>
  );
}
