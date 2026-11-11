"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";

/** A-4 — manajemen user: cari, lihat detail & kuota, suspend, hapus. */
export default function AdminUsersPage() {
  return (
    <AdminShell active="users" title="Manajemen User">
      <AdminUsersPanel />
    </AdminShell>
  );
}
