"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  void open; // mobile menu — wired up later
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      display: "flex", alignItems: "center", gap: 32,
      padding: "0 32px", height: 60,
      background: "color-mix(in oklch, var(--card) 90%, transparent)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <span style={{
          width: 32, height: 32, borderRadius: "var(--radius-md)",
          background: "var(--aigt-spark)", color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon name="sparkles" size={16} />
        </span>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 800, letterSpacing: "-.01em", color: "var(--foreground)" }}>
          AI-GT
        </span>
      </Link>

      {/* Center nav */}
      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        {[
          { label: "Fitur",     href: "#features" },
          { label: "Cara Kerja", href: "#steps"   },
          { label: "Harga",     href: "#pricing"  },
        ].map((l) => (
          <a key={l.label} href={l.href} style={{
            padding: "6px 12px", borderRadius: "var(--radius-md)",
            fontSize: "var(--text-xs)", fontWeight: 500,
            color: "var(--muted-foreground)", textDecoration: "none",
            transition: "color .15s",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            {l.label}
          </a>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/login">
          <Button variant="ghost" size="sm">Masuk</Button>
        </Link>
        <Link href="/register">
          <Button size="sm" icon="sparkles">Daftar Gratis</Button>
        </Link>
      </div>
    </nav>
  );
}
