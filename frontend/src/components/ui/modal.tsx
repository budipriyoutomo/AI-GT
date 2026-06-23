"use client";

import { ReactNode, useEffect } from "react";
import { Icon } from "./icon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, icon, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="aigt-scrim"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="aigt-modal" role="dialog" aria-modal="true">
        <div className="flex items-center gap-2.5 px-[18px] py-4 border-b border-[var(--border)]">
          {icon && (
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-lg)] flex-none"
              style={{ background: "var(--tint-primary)", color: "var(--primary)" }}
            >
              <Icon name={icon} size={15} />
            </span>
          )}
          <div className="aigt-h5 flex-1">{title}</div>
          <button className="aigt-iconbtn" onClick={onClose} aria-label="Tutup">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="p-[18px] text-[var(--text-sm)]">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-[18px] py-3.5 border-t border-[var(--border)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
