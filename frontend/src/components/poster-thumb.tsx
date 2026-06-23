import { CSSProperties } from "react";
import { Icon } from "./ui/icon";

interface PosterThumbProps {
  title: string;
  kicker?: string;
  cta?: string | null;
  accent?: string;
  ratio?: string;
  platform?: string;
  style?: CSSProperties;
}

export function PosterThumb({
  title,
  kicker,
  cta,
  accent = "--chart-1",
  ratio = "4 / 5",
  platform,
  style,
}: PosterThumbProps) {
  const bg = `color-mix(in oklch, var(${accent}) 13%, var(--card))`;
  const ink = `color-mix(in oklch, var(${accent}) 72%, var(--foreground))`;
  const solid = `var(${accent})`;

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: ratio,
        background: bg,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 16, height: 16, borderRadius: 5, background: solid,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "#fff", flex: "none",
          }}
        >
          <Icon name={platform ?? "sparkles"} size={10} />
        </span>
        <span
          style={{
            fontSize: 9, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: ".1em", color: ink, opacity: 0.8,
          }}
        >
          AI-GT
        </span>
      </div>
      <div
        style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "center", gap: 5,
        }}
      >
        {kicker && (
          <div
            style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: ".12em", color: solid,
            }}
          >
            {kicker}
          </div>
        )}
        <div
          style={{
            fontSize: 19, fontWeight: 800, lineHeight: 1.08,
            letterSpacing: "-.02em", color: ink,
          }}
        >
          {title}
        </div>
      </div>
      {cta && (
        <div
          style={{
            display: "inline-flex", alignSelf: "flex-start",
            padding: "4px 10px", borderRadius: 999,
            background: solid, color: "#fff",
            fontSize: 10, fontWeight: 700,
          }}
        >
          {cta}
        </div>
      )}
    </div>
  );
}
