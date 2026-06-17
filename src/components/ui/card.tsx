import { ReactNode, CSSProperties } from "react";

type Variant = "elevated" | "sunken" | "plain";

interface CardProps {
  variant?: Variant;
  padding?: number;
  hover?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

const variants: Record<Variant, string> = {
  elevated:
    "bg-[var(--card)] border border-[var(--border)] shadow-[var(--shadow-sm)]",
  sunken:
    "bg-[var(--surface-sunken)] border border-[var(--border)]",
  plain:
    "bg-transparent border border-transparent",
};

export function Card({
  variant = "elevated",
  padding = 16,
  hover,
  children,
  className = "",
  style,
  onClick,
}: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-xl)] ${variants[variant]} ${hover ? "transition-shadow duration-150 hover:shadow-[var(--shadow-md)] cursor-pointer" : ""} ${className}`}
      style={{ padding, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
