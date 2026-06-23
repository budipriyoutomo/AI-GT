"use client";

import { Icon } from "@/components/ui/icon";

interface FeatureCardProps {
  icon: string;
  title: string;
  desc: string;
  color: string;
  tint: string;
}

export function FeatureCard({ icon, title, desc, color, tint }: FeatureCardProps) {
  return (
    <div
      style={{
        padding: "22px 22px 24px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        background: "var(--card)",
        display: "flex", flexDirection: "column", gap: 12,
        transition: "box-shadow .18s, transform .18s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px color-mix(in oklch, var(--primary) 10%, rgba(0,0,0,.08))";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.transform = "none";
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 44, height: 44, borderRadius: "var(--radius-lg)",
          background: tint,
          border: `1px solid color-mix(in oklch, ${color} 20%, transparent)`,
          color,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon name={icon as "sparkles"} size={20} />
      </span>
      <div>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.65 }}>{desc}</div>
      </div>
    </div>
  );
}
