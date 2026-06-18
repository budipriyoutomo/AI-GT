"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth";

const NAV = [
  {
    group: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "layout-dashboard", href: "/" },
      { id: "templates", label: "Galeri Template", icon: "layout-grid", href: "/templates" },
      { id: "history", label: "Riwayat", icon: "history", href: "/history", badge: "12" },
      { id: "schedule", label: "Jadwal", icon: "calendar-clock", href: "/schedule", badge: "9" },
    ],
  },
  {
    group: "Brand",
    items: [
      { id: "profile", label: "Profil Bisnis", icon: "building-2", href: "/onboarding" },
      { id: "brandkit", label: "Brand Kit", icon: "palette", href: "/onboarding" },
    ],
  },
  {
    group: "Akun",
    items: [
      { id: "settings", label: "Pengaturan", icon: "settings", href: "/settings" },
    ],
  },
];

interface SidebarProps {
  active: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function Sidebar({ active }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <aside className="aigt-side">
      {/* Brand */}
      <div className="aigt-brand">
        <span className="aigt-mark">
          <Icon name="sparkles" size={15} />
        </span>
        <div>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.01em" }}>
            AI-GT
          </div>
          <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 3 }}>
            Content Studio
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "12px 12px 4px" }}>
        <Button icon="sparkles" style={{ width: "100%" }} onClick={() => {}}>
          <Link href="/templates" style={{ all: "inherit" }}>Buat Konten</Link>
        </Button>
      </div>

      {/* Nav */}
      <nav className="aigt-nav">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="aigt-glabel aigt-label">{g.group}</div>
            {g.items.map((it) => (
              <Link
                key={it.id}
                href={it.href}
                className={`aigt-nitem${active === it.id ? " active" : ""}`}
              >
                <Icon name={it.icon} size={16} />
                {it.label}
                {it.badge && (
                  <span className="aigt-nbadge">
                    <Badge variant="secondary">{it.badge}</Badge>
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div
        style={{
          borderTop: "1px solid var(--sidebar-border)",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Avatar initials={user ? initials(user.name) : "?"} size={30} status="online" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: "var(--text-xs)", fontWeight: 600,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {user?.name ?? "—"}
          </div>
          <div style={{ fontSize: 10, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.businessName ?? user?.email ?? ""}
          </div>
        </div>
        <ThemeToggle />
        <button
          className="aigt-iconbtn"
          title="Keluar"
          onClick={handleLogout}
          style={{ width: 28, height: 28 }}
        >
          <Icon name="log-out" size={14} />
        </button>
      </div>
    </aside>
  );
}
