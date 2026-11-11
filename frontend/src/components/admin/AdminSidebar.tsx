"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { AdminIdentity } from "@/api/adminApi";

const ADMIN_NAV = [
  { id: "dashboard", label: "Ringkasan",  icon: "gauge",        href: "/admin"          },
  { id: "orders",    label: "Pembayaran", icon: "receipt-text", href: "/admin/orders"   },
  { id: "users",     label: "User",       icon: "users",        href: "/admin/users"    },
  { id: "templates", label: "Template",   icon: "layout-template", href: "/admin/templates" },
  { id: "messages",  label: "Pesan",      icon: "mail",         href: "/admin/messages" },
  { id: "audit",     label: "Audit log",  icon: "scroll-text",  href: "/admin/audit"    },
  { id: "storage",   label: "Storage",    icon: "hard-drive",   href: "/admin/storage"  },
];

export function AdminSidebar({ active, admin }: { active: string; admin: AdminIdentity | null }) {
  const router = useRouter();

  return (
    <aside className="aigt-sidebar" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px" }}>
        <span className="aigt-mark"><Icon name="shield" size={15} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, lineHeight: 1 }}>AI-GT Admin</div>
          <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 3 }}>
            {admin?.role === "superadmin" ? "Superadmin" : "Admin"}
          </div>
        </div>
      </div>

      <nav className="aigt-nav">
        {ADMIN_NAV.map((it) => (
          <Link
            key={it.id}
            href={it.href}
            className={`aigt-nitem${active === it.id ? " active" : ""}`}
          >
            <Icon name={it.icon as "users"} size={16} />
            {it.label}
          </Link>
        ))}
      </nav>

      <div style={{ marginTop: "auto", borderTop: "1px solid var(--sidebar-border)", padding: "10px 12px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {admin?.name ?? "—"}
        </div>
        <div style={{ fontSize: 10, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {admin?.email ?? ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
          <ThemeToggle />
          <Badge variant="secondary">admin</Badge>
          <button
            className="aigt-iconbtn"
            aria-label="Kembali ke aplikasi"
            title="Kembali ke aplikasi"
            style={{ marginLeft: "auto", width: 26, height: 26 }}
            onClick={() => router.push("/dashboard")}
          >
            <Icon name="log-out" size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
