import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Toaster, toast } from "../toast";

describe("toast", () => {
  afterEach(() => vi.useRealTimers());

  it("muncul di Toaster lalu hilang setelah 3,8 detik", () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => { toast({ title: "Tersimpan", desc: "Draft aman", variant: "success" }); });
    expect(screen.getByText("Tersimpan")).toBeInTheDocument();
    expect(screen.getByText("Draft aman")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3800); });
    expect(screen.queryByText("Tersimpan")).not.toBeInTheDocument();
  });

  it("menerima string dan menumpuk beberapa toast", () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => { toast("Satu"); toast("Dua"); });
    expect(screen.getByText("Satu")).toBeInTheDocument();
    expect(screen.getByText("Dua")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3800); });
  });
});
