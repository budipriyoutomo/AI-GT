"use client";

import { InputHTMLAttributes } from "react";
import { Icon } from "./icon";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  error?: string;
}

export function Input({ label, icon, error, className = "", style, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5" style={style as React.CSSProperties}>
      {label && (
        <label className="text-[var(--text-xs)] font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none">
            <Icon name={icon} size={14} />
          </span>
        )}
        <input
          className={`h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] px-3 text-[var(--text-sm)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--ring)] focus:ring-3 focus:ring-[color-mix(in_oklch,var(--ring)_35%,transparent)] transition-all ${icon ? "pl-9" : ""} ${error ? "border-[var(--destructive)]" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[var(--text-xs)] text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
