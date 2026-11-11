import { useEffect, useRef } from "react";

export function useAutoSave(
  enabled: boolean,
  fn: () => Promise<void>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[],
  delay = 1000,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Selalu panggil fn terbaru tanpa me-reset timer: ref diperbarui setelah render (bukan saat render).
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!enabled) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fnRef.current();
    }, delay);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);
}
