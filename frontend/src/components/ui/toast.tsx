"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Icon } from "./icon";

type ToastVariant = "default" | "success" | "error" | "warning" | "info";

interface ToastData {
  id: string;
  title: string;
  desc?: string;
  variant?: ToastVariant;
  icon?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<ToastData, "id"> | string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const variantColors: Record<ToastVariant, string> = {
  default: "var(--primary)",
  success: "var(--success)",
  error: "var(--destructive)",
  warning: "var(--warning)",
  info: "var(--info)",
};

const variantIcons: Record<ToastVariant, string> = {
  default: "sparkles",
  success: "circle-check-big",
  error: "circle-x",
  warning: "triangle-alert",
  info: "info",
};

export function Toaster() {
  const { toasts } = useToasterState();

  return (
    <div className="aigt-toasts">
      {toasts.map((t) => {
        const variant = t.variant ?? "default";
        return (
          <div key={t.id} className="aigt-toast">
            <span style={{ color: variantColors[variant], marginTop: 1, flex: "none" }}>
              <Icon name={t.icon ?? variantIcons[variant]} size={17} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{t.title}</div>
              {t.desc && (
                <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginTop: 2 }}>
                  {t.desc}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

let _toasterState: { toasts: ToastData[]; setToasts: React.Dispatch<React.SetStateAction<ToastData[]>> } | null = null;

function useToasterState() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  _toasterState = { toasts, setToasts };
  return { toasts };
}

export function toast(opts: Omit<ToastData, "id"> | string) {
  const data: Omit<ToastData, "id"> = typeof opts === "string" ? { title: opts } : opts;
  const id = Math.random().toString(36).slice(2);
  _toasterState?.setToasts((arr) => [...arr, { ...data, id }]);
  setTimeout(() => {
    _toasterState?.setToasts((arr) => arr.filter((x) => x.id !== id));
  }, 3800);
}
