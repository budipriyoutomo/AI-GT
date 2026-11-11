import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useGenerateSession } from "../useGenerateSession";

const getSession = vi.fn();
vi.mock("@/api/generateApi", () => ({ generateApi: { getSession: (...a: unknown[]) => getSession(...a) } }));

const s = (status: string) => ({ id: "s1", status });

describe("useGenerateSession", () => {
  beforeEach(() => { getSession.mockClear(); });
  afterEach(() => vi.useRealTimers());

  it("tanpa sessionId: tidak loading, tidak fetch", () => {
    const { result } = renderHook(() => useGenerateSession(null));
    expect(result.current.loading).toBe(false);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("loading sampai fetch pertama selesai", async () => {
    getSession.mockResolvedValue(s("completed"));
    const { result } = renderHook(() => useGenerateSession("s1"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toEqual(s("completed"));
  });

  it("polling selama processing, berhenti setelah status final", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getSession.mockResolvedValueOnce(s("processing")).mockResolvedValue(s("completed"));
    const { result } = renderHook(() => useGenerateSession("s1"));
    await waitFor(() => expect(result.current.session?.status).toBe("processing"));
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    await waitFor(() => expect(result.current.session?.status).toBe("completed"));
    const calls = getSession.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(getSession.mock.calls.length).toBe(calls);
  });

  it("error: pesan diset dan loading selesai", async () => {
    getSession.mockRejectedValue(new Error("Sesi tidak ditemukan"));
    const { result } = renderHook(() => useGenerateSession("s1"));
    await waitFor(() => expect(result.current.error).toBe("Sesi tidak ditemukan"));
    expect(result.current.loading).toBe(false);
  });

  it("ganti sessionId → loading lagi untuk session baru", async () => {
    getSession.mockResolvedValue(s("completed"));
    const { result, rerender } = renderHook(({ id }) => useGenerateSession(id), { initialProps: { id: "s1" } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let release: (v: unknown) => void = () => {};
    getSession.mockReturnValueOnce(new Promise((r) => { release = r; }));
    rerender({ id: "s2" });
    expect(result.current.loading).toBe(true);
    await act(async () => { release({ id: "s2", status: "completed" }); });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
