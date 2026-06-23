"use client";

import { icons } from "lucide-react";
import { CSSProperties } from "react";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, className, style }: IconProps) {
  // Convert kebab-case to PascalCase
  const key = name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("") as keyof typeof icons;

  const LucideIcon = icons[key];
  if (!LucideIcon) return null;

  return (
    <LucideIcon
      size={size}
      className={className}
      style={style}
      aria-hidden="true"
      strokeWidth={2}
    />
  );
}
