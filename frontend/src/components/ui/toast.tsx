"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./icon";

type ToastVariant = "default" | "success" | "error" | "warning" | "info";

interface ToastData {
  id: string;
  title: string;
  desc?: string;
  variant?: ToastVariant;
  icon?: string;
}

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

// Store modul kecil: toast() bisa dipanggil dari mana saja (di luar komponen), Toaster berlangganan.
let current: ToastData[] = [];
const EMPTY: ToastData[] = [];
const listeners = new Set<() => void>();

function setToasts(update: (arr: ToastData[]) => ToastData[]) {
  current = update(current);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function useToasterState() {
  return { toasts: useSyncExternalStore(subscribe, () => current, () => EMPTY) };
}

export function toast(opts: Omit<ToastData, "id"> | string) {
  const data: Omit<ToastData, "id"> = typeof opts === "string" ? { title: opts } : opts;
  const id = Math.random().toString(36).slice(2);
  setToasts((arr) => [...arr, { ...data, id }]);
  setTimeout(() => {
    setToasts((arr) => arr.filter((x) => x.id !== id));
  }, 3800);
}
