import { ReactNode } from "react";
import { Icon } from "./icon";

type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "info"
  | "destructive";

interface BadgeProps {
  variant?: Variant;
  icon?: string;
  dot?: boolean;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const base =
  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-medium leading-none";

const variants: Record<Variant, string> = {
  default:
    "bg-[var(--primary)] text-[var(--primary-foreground)]",
  secondary:
    "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  outline:
    "border border-[var(--border)] text-[var(--foreground)] bg-transparent",
  success:
    "bg-[var(--tint-success)] text-[var(--success)]",
  warning:
    "bg-[var(--tint-warning)] text-[var(--warning)]",
  info:
    "bg-[var(--tint-info)] text-[var(--info)]",
  destructive:
    "bg-[var(--tint-destructive)] text-[var(--destructive)]",
};

const dotColors: Record<Variant, string> = {
  default: "bg-[var(--primary-foreground)]",
  secondary: "bg-[var(--muted-foreground)]",
  outline: "bg-[var(--foreground)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  info: "bg-[var(--info)]",
  destructive: "bg-[var(--destructive)]",
};

export function Badge({
  variant = "default",
  icon,
  dot,
  children,
  className = "",
  style,
}: BadgeProps) {
  return (
    <span className={`${base} ${variants[variant]} ${className}`} style={style}>
      {dot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${dotColors[variant]}`}
        />
      )}
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
}
