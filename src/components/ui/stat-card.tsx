import { Icon } from "./icon";

type Variant = "default" | "primary" | "success" | "warning" | "info";

interface StatCardProps {
  title: string;
  value: string;
  icon?: string;
  variant?: Variant;
  trend?: { value: string; positive: boolean };
  subtitle?: string;
}

const variantStyle: Record<Variant, { icon: string; text: string }> = {
  default: { icon: "var(--secondary)", text: "var(--muted-foreground)" },
  primary: { icon: "var(--tint-primary)", text: "var(--primary)" },
  success: { icon: "var(--tint-success)", text: "var(--success)" },
  warning: { icon: "var(--tint-warning)", text: "var(--warning)" },
  info: { icon: "var(--tint-info)", text: "var(--info)" },
};

export function StatCard({ title, value, icon, variant = "default", trend, subtitle }: StatCardProps) {
  const s = variantStyle[variant];
  return (
    <div
      className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)] p-4 flex flex-col justify-between"
      style={{ minHeight: 100 }}
    >
      <div className="flex items-start justify-between">
        <p className="text-[var(--text-xs)] font-medium text-[var(--muted-foreground)]">{title}</p>
        {icon && (
          <span
            className="inline-flex items-center justify-center rounded-[var(--radius-md)] flex-none"
            style={{ width: 32, height: 32, background: s.icon, color: s.text }}
          >
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <div>
        <p
          className="font-bold leading-none"
          style={{ fontSize: "var(--text-2xl)", marginTop: 6 }}
        >
          {value}
        </p>
        {trend && (
          <p
            className="mt-1 text-[var(--text-xs)] font-medium"
            style={{ color: trend.positive ? "var(--success)" : "var(--destructive)" }}
          >
            {trend.value}
          </p>
        )}
        {subtitle && (
          <p className="mt-1 text-[var(--text-xs)] text-[var(--muted-foreground)]">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
