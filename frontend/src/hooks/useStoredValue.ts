import { useCallback, useSyncExternalStore } from "react";

// Penulisan dari tab ini tidak memicu event "storage" — siarkan sendiri supaya semua pemakai ikut.
const LOCAL_EVENT = "aigt-stored-value";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(LOCAL_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(LOCAL_EVENT, listener);
  };
}

/**
 * Preferensi UI di localStorage, dibaca tanpa setState di effect.
 * Server & hydration memakai `serverValue`, lalu klien beralih ke nilai tersimpan
 * (atau `fallback()` bila belum ada — fallback tidak ikut disimpan).
 */
export function useStoredValue(
  key: string,
  fallback: () => string,
  serverValue: string,
): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? fallback(),
    () => serverValue,
  );
  const set = useCallback((next: string) => {
    localStorage.setItem(key, next);
    window.dispatchEvent(new Event(LOCAL_EVENT));
  }, [key]);
  return [value, set];
}
