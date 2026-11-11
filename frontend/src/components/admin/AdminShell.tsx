"use client";

import { ReactNode, CSSProperties, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { adminApi, type AdminIdentity } from "@/api/adminApi";
import { AdminSidebar } from "./AdminSidebar";

type Gate = "checking" | "allowed" | "denied";

interface AdminShellProps {
  active: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  contentStyle?: CSSProperties;
}

export function AdminShell({ active, title, actions, children, contentStyle }: AdminShellProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("checking");
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    let alive = true;
    adminApi.ping()
      .then((identity) => {
        if (!alive) return;
        setAdmin(identity);
        setGate("allowed");
      })
      .catch(() => {
        if (!alive) return;
        setGate("denied");
        router.replace("/dashboard");
      });
    return () => { alive = false; };
  }, [user, router]);

  // Selama "checking" isi halaman TIDAK digambar — jangan pernah menampilkan
  // data admin lebih dulu lalu menyembunyikannya setelah ping gagal.
  if (gate !== "allowed") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", color: "var(--muted-foreground)", fontSize: "var(--text-sm)",
      }}>
        {gate === "checking" ? "Memeriksa akses…" : "Akses ditolak. Mengalihkan…"}
      </div>
    );
  }

  return (
    <div className="aigt-app">
      <AdminSidebar active={active} admin={admin} />
      <div className="aigt-main">
        <header style={{
          padding: "14px 28px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          <div className="aigt-h5">{title}</div>
          {actions}
        </header>
        <div className="aigt-content" style={contentStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}
