"use client";

import { ReactNode, CSSProperties, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";

interface ShellProps {
  active: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  contentStyle?: CSSProperties;
}

export function Shell({ active, title, actions, children, contentStyle }: ShellProps) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="aigt-app">
      <Sidebar active={active} />
      <div className="aigt-main">
        <TopNav title={title} actions={actions} />
        <div className="aigt-content" style={contentStyle}>
          {children}
        </div>
        <footer style={{
          padding: "14px 32px",
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 10,
        }}>
          <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>© 2026 AI-GT</span>
          <nav style={{ display: "flex", gap: 16 }}>
            {[
              { label: "Syarat Layanan",    href: "/terms"   },
              { label: "Kebijakan Privasi", href: "/privacy" },
              { label: "Hubungi Kami",      href: "/contact" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  fontSize: 10, color: "var(--muted-foreground)",
                  textDecoration: "none", fontWeight: 500,
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}
