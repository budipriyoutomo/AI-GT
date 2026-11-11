import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoSave } from "../useAutoSave";

describe("useAutoSave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("menjalankan fn setelah delay, sekali per rentetan perubahan (debounce)", () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ v }) => useAutoSave(true, fn, [v], 1000), { initialProps: { v: 1 } });
    vi.advanceTimersByTime(500);
    rerender({ v: 2 });
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("memanggil fn TERBARU, bukan closure saat timer dipasang", () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const latest = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ fn }) => useAutoSave(true, fn, ["same"], 1000), { initialProps: { fn: first } });
    rerender({ fn: latest });  // deps sama → timer tidak di-reset
    vi.advanceTimersByTime(1000);
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
  });

  it("tidak jalan saat disabled, dan unmount membatalkan timer", () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutoSave(false, fn, [1], 1000));
    vi.advanceTimersByTime(2000);
    expect(fn).not.toHaveBeenCalled();

    const { unmount } = renderHook(() => useAutoSave(true, fn, [1], 1000));
    unmount();
    vi.advanceTimersByTime(2000);
    expect(fn).not.toHaveBeenCalled();
  });
});
