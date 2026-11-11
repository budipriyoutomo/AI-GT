"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminMetricsDashboard } from "@/components/admin/AdminMetricsDashboard";

/** A-8 — ringkasan admin. Navigasi ke tiap bagian lewat AdminSidebar. */
export default function AdminDashboardPage() {
  return (
    <AdminShell active="dashboard" title="Ringkasan Admin">
      <AdminMetricsDashboard />
    </AdminShell>
  );
}
