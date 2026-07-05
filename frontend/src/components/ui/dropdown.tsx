"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "./icon";

export interface DropdownOption {
  value: string;
  label: string;
  description: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export function Dropdown({ options, value, onChange, placeholder = "Pilih…", ariaLabel }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "var(--surface-sunken)",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          textAlign: "left",
          transition: "border-color .15s ease",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--foreground)" }}>
                {selected.label}
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginTop: 1 }}>
                {selected.description}
              </div>
            </>
          ) : (
            <div style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>{placeholder}</div>
          )}
        </div>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            listStyle: "none",
            margin: 0,
            padding: "4px 0",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            background: "var(--popover)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: isSelected ? "var(--tint-primary)" : "transparent",
                  transition: "background .1s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLLIElement).style.background = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLLIElement).style.background = isSelected ? "var(--tint-primary)" : "transparent";
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: isSelected ? 600 : 500, color: isSelected ? "var(--primary)" : "var(--foreground)" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginTop: 1 }}>
                    {opt.description}
                  </div>
                </div>
                {isSelected && <Icon name="check" size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
