"use client";

import { useState } from "react";

interface SwitchProps {
  label?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function Switch({ label, defaultChecked, disabled, checked: controlledChecked, onChange }: SwitchProps) {
  const [internal, setInternal] = useState(defaultChecked ?? false);
  const isChecked = controlledChecked !== undefined ? controlledChecked : internal;

  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    setInternal(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={toggle}
      disabled={disabled}
      className="flex items-center gap-3 text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <span
        className="relative inline-flex h-5 w-9 flex-none rounded-full border-2 border-transparent transition-colors duration-200"
        style={{ background: isChecked ? "var(--primary)" : "var(--muted-foreground)" }}
      >
        <span
          className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: isChecked ? "translateX(16px)" : "translateX(0)" }}
        />
      </span>
      {label && (
        <span className="text-[var(--text-sm)] text-[var(--foreground)]">{label}</span>
      )}
    </button>
  );
}
