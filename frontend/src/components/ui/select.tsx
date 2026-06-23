"use client";

import { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: string[];
}

export function Select({ label, options, className = "", style, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5" style={style as React.CSSProperties}>
      {label && (
        <label className="text-[var(--text-xs)] font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <select
        className={`h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] px-3 text-[var(--text-sm)] text-[var(--foreground)] outline-none focus:border-[var(--ring)] focus:ring-3 focus:ring-[color-mix(in_oklch,var(--ring)_35%,transparent)] cursor-pointer transition-all appearance-none ${className}`}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
        {...props}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
