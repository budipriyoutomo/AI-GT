"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminTemplatesPanel } from "@/components/admin/AdminTemplatesPanel";

/** A-6 — template live (metadata, gambar, aktif/nonaktif) + draft Template Lab. */
export default function AdminTemplatesPage() {
  return (
    <AdminShell active="templates" title="Template">
      <AdminTemplatesPanel />
    </AdminShell>
  );
}
