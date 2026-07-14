"use client";

import { Icon } from "@/components/ui/icon";

/**
 * Brand-preview toggle — same behavior as the gallery preview modal
 * (TemplatePreviewModal): flips between original and brand-adapted render.
 * When the user has no brand colors yet, `hasBrand` is false and clicking
 * should route to Settings (handled by the caller via `onToggle`).
 */
export function BrandPreviewToggle({
  active,
  hasBrand,
  onToggle,
  size = "md",
}: {
  active: boolean;
  hasBrand: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
}) {
  const height = size === "sm" ? 30 : 38;
  const fontSize = size === "sm" ? "var(--text-xs)" : "var(--text-sm)";
  const label = !hasBrand
    ? "Atur brand color"
    : active
      ? "Kembali ke original"
      : "Preview dengan brand color";

  return (
    <button
      onClick={onToggle}
      title={!hasBrand ? "Lengkapi brand color di Settings" : undefined}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
        width: "100%", height, borderRadius: "var(--radius-md)", cursor: "pointer",
        fontSize, fontWeight: 500,
        transition: "all 0.15s ease",
        ...(active
          ? { background: "var(--tint-primary)", border: "1px solid var(--primary)", color: "var(--primary)" }
          : { background: "transparent", border: "1px solid var(--border)", color: "var(--foreground)" }),
      }}
    >
      <Icon name="palette" size={size === "sm" ? 12 : 14} />
      {label}
    </button>
  );
}
