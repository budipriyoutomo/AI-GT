"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
      { id: "dashboard", label: "Dashboard",       icon: "layout-dashboard", href: "/"          },
      { id: "campaign",  label: "Campaign",        icon: "megaphone",        href: "/campaign"  },
      { id: "templates", label: "Galeri Template", icon: "layout-grid",      href: "/templates" },
      { id: "history",   label: "Riwayat",         icon: "history",          href: "/history",  badge: "12" },
    ],
  },
  {
    group: "Akun",
    items: [
      { id: "settings", label: "Pengaturan", icon: "settings", href: "/settings" },
    ],
  },
];

interface SidebarProps { active: string }

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

/* ── Custom tooltip via portal ────────────────────────────── */

function SidebarTooltip({ label, badge, anchorRef, visible }: {
  label: string;
  badge?: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  visible: boolean;
}) {
  const [top, setTop] = useState(0);

  useEffect(() => {
    if (visible && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setTop(rect.top + rect.height / 2);
    }
  }, [visible, anchorRef]);

  if (!visible || typeof window === "undefined") return null;

  return createPortal(
    <div className="aigt-sidebar-tooltip" style={{ top, left: 66, transform: "translateY(-50%)" }}>
      <Icon name="sparkles" size={10} style={{ color: "var(--primary)", flexShrink: 0 }} />
      <span>{label}</span>
      {badge && (
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: 18, height: 18, borderRadius: 999, padding: "0 5px",
          background: "var(--primary)", color: "#fff",
          fontSize: 10, fontWeight: 700,
        }}>{badge}</span>
      )}
    </div>,
    document.body
  );
}

/* ── Single nav item ──────────────────────────────────────── */

type NavEntry = typeof NAV[0]["items"][0];

function NavItem({ it, active, collapsed }: { it: NavEntry; active: string; collapsed: boolean }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <>
      <Link
        ref={ref}
        href={it.href}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`aigt-nitem${active === it.id ? " active" : ""}`}
        style={collapsed ? { justifyContent: "center", padding: "9px 0", gap: 0 } : undefined}
      >
        <Icon name={it.icon as "history"} size={16} />
        {!collapsed && it.label}
        {!collapsed && it.badge && (
          <span className="aigt-nbadge"><Badge variant="secondary">{it.badge}</Badge></span>
        )}
      </Link>

      {collapsed && (
        <SidebarTooltip
          label={it.label}
          badge={it.badge}
          anchorRef={ref}
          visible={hovered}
        />
      )}
    </>
  );
}

/* ── Sidebar ──────────────────────────────────────────────── */

export function Sidebar({ active }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <aside
      className="aigt-side"
      style={{ width: collapsed ? 56 : 224, transition: "width 0.2s ease", overflow: "hidden" }}
    >
      {/* Brand */}
      <div className="aigt-brand" style={{ justifyContent: collapsed ? "center" : undefined }}>
        {collapsed ? (
          <button
            onClick={toggle}
            title="Tampilkan sidebar"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex" }}
          >
            <span className="aigt-mark"><Icon name="sparkles" size={15} /></span>
          </button>
        ) : (
          <>
            <span className="aigt-mark" style={{ flexShrink: 0 }}>
              <Icon name="sparkles" size={15} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.01em" }}>AI-GT</div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 3 }}>Content Studio</div>
            </div>
            <button onClick={toggle} title="Sembunyikan sidebar" className="aigt-iconbtn" style={{ width: 26, height: 26, flexShrink: 0 }}>
              <Icon name="panel-left-close" size={14} />
            </button>
          </>
        )}
      </div>

      {/* CTA */}
      <div style={{ padding: collapsed ? "10px 8px 4px" : "12px 12px 4px" }}>
        {collapsed ? (
          <Link href="/templates" title="Buat Konten" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 40, height: 36, margin: "0 auto",
            background: "var(--primary)", borderRadius: "var(--radius-md)", color: "#fff",
          }}>
            <Icon name="sparkles" size={15} />
          </Link>
        ) : (
          <Button icon="sparkles" style={{ width: "100%" }}>
            <Link href="/templates" style={{ all: "inherit" }}>Buat Konten</Link>
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="aigt-nav">
        {NAV.map((g) => (
          <div key={g.group}>
            {!collapsed
              ? <div className="aigt-glabel aigt-label">{g.group}</div>
              : <div style={{ height: 8 }} />
            }
            {g.items.map((it) => (
              <NavItem key={it.id} it={it} active={active} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{
        borderTop: "1px solid var(--sidebar-border)",
        padding: collapsed ? "10px 0" : "10px 12px",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : undefined,
        gap: collapsed ? 0 : 10,
        flexDirection: collapsed ? "column" : "row",
      }}>
        <Avatar initials={user ? initials(user.name) : "?"} size={30} status="online" />
        {!collapsed && (
          <>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.name ?? "—"}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.businessName ?? user?.email ?? ""}
              </div>
            </div>
            <ThemeToggle />
          </>
        )}
        <button
          className="aigt-iconbtn"
          title="Keluar"
          onClick={handleLogout}
          style={{ width: 28, height: 28, marginTop: collapsed ? 4 : 0 }}
        >
          <Icon name="log-out" size={14} />
        </button>
      </div>
    </aside>
  );
}
