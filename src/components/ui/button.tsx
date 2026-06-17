"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";
import { Icon } from "./icon";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "default" | "lg" | "icon" | "icon-sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconRight?: string;
  children?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1";

const variants: Record<Variant, string> = {
  default:
    "bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-90 shadow-[var(--shadow-xs)]",
  secondary:
    "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]",
  outline:
    "bg-transparent border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)]",
  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-[var(--accent)]",
  destructive:
    "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:brightness-90",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-3 text-[var(--text-xs)]",
  default: "h-9 px-4 text-[var(--text-sm)]",
  lg: "h-10 px-5 text-[var(--text-sm)]",
  icon: "h-9 w-9 p-0",
  "icon-sm": "h-7 w-7 p-0",
};

export function Button({
  variant = "default",
  size = "default",
  icon,
  iconRight,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const iconSize = size === "sm" || size === "icon-sm" ? 13 : 15;
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}
