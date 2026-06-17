interface ProgressBarProps {
  value: number;
  label?: string;
  showLabel?: boolean;
  color?: "primary" | "auto";
  height?: number;
}

function autoColor(v: number) {
  if (v >= 90) return "var(--success)";
  if (v >= 80) return "var(--warning)";
  return "var(--destructive)";
}

export function ProgressBar({ value, label, showLabel, color = "primary", height = 8 }: ProgressBarProps) {
  const fill = color === "auto" ? autoColor(value) : "var(--primary)";
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div>
      {(label || showLabel) && (
        <div className="flex justify-between mb-1.5">
          {label && <span className="text-[var(--text-xs)] text-[var(--muted-foreground)]">{label}</span>}
          {showLabel && <span className="text-[var(--text-xs)] font-medium text-[var(--foreground)]">{pct}%</span>}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, background: "var(--muted)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: fill }}
        />
      </div>
    </div>
  );
}
