"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

interface FontSelectProps {
  label?: string;
  value: string;
  onChange: (font: string) => void;
  options: string[];
  /** Contoh teks pratinjau di tiap opsi. Default: nama font itu sendiri. */
  sample?: string;
}

/** Bangun href Google Fonts untuk semua family sekaligus. */
function googleFontsHref(families: string[]): string {
  const params = families
    .map((f) => `family=${f.trim().replace(/\s+/g, "+")}:wght@400;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** Inject <link> Google Fonts sekali saja per kombinasi family. */
function useGoogleFonts(families: string[]) {
  useEffect(() => {
    const id = "aigt-font-preview";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    const href = googleFontsHref(families);
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [families]);
}

function fontStack(font: string): string {
  const serif = ["Playfair Display"];
  const fallback = serif.includes(font) ? "serif" : "sans-serif";
  return `"${font}", ${fallback}`;
}

export function FontSelect({ label, value, onChange, options, sample }: FontSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useGoogleFonts(options);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[var(--text-xs)] font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <div ref={wrapRef} style={{ position: "relative" }}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] px-3 text-[var(--text-sm)] text-[var(--foreground)] outline-none focus:border-[var(--ring)] cursor-pointer transition-all flex items-center justify-between gap-2"
        >
          <span style={{ fontFamily: fontStack(value), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {value}
          </span>
          <Icon name="chevron-down" size={14} style={{ color: "var(--muted-foreground)", flex: "none" }} />
        </button>

        {/* Dropdown */}
        {open && (
          <ul
            role="listbox"
            style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
              maxHeight: 280, overflowY: "auto",
              padding: 4, margin: 0, listStyle: "none",
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)",
            }}
          >
            {options.map((opt) => {
              const selected = opt === value;
              return (
                <li key={opt} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt); setOpen(false); }}
                    style={{
                      width: "100%", textAlign: "left", cursor: "pointer",
                      display: "flex", flexDirection: "column", gap: 2,
                      padding: "8px 10px", border: "none", borderRadius: "var(--radius-sm)",
                      background: selected ? "var(--tint-primary)" : "transparent",
                      color: "var(--foreground)",
                    }}
                    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "var(--surface-sunken)"; }}
                    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontFamily: fontStack(opt), fontSize: "var(--text-sm)", fontWeight: 600 }}>{opt}</span>
                      {selected && <Icon name="check" size={14} style={{ color: "var(--primary)", flex: "none" }} />}
                    </span>
                    <span style={{ fontFamily: fontStack(opt), fontSize: 13, color: "var(--muted-foreground)" }}>
                      {sample ?? "AaBbCc 123 — Promo spesial hari ini"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
