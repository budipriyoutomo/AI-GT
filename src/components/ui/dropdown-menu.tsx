"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "./icon";

interface MenuItem {
  label?: string;
  icon?: string;
  onClick?: () => void;
  divider?: boolean;
  danger?: boolean;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, items, align = "right" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div
          className="aigt-menu"
          style={{ top: "calc(100% + 6px)", [align]: 0 }}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div
                key={`d${i}`}
                style={{ height: 1, background: "var(--border)", margin: "5px 4px" }}
              />
            ) : (
              <button
                key={item.label}
                className={`aigt-menuitem${item.danger ? " danger" : ""}`}
                onClick={() => { setOpen(false); item.onClick?.(); }}
              >
                {item.icon && <Icon name={item.icon} size={15} />}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
