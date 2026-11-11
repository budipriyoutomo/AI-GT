import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "../theme-provider";
import { ThemeToggle } from "../ui/theme-toggle";

function mockSystemDark(dark: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: dark && q.includes("dark"), media: q,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
  }));
}

function renderToggle() {
  render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
  return screen.getByRole("button", { name: "Ubah tema" });
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    mockSystemDark(false);
  });

  it("memakai tema tersimpan", () => {
    localStorage.setItem("aigt-theme", "dark");
    const btn = renderToggle();
    expect(document.documentElement).toHaveClass("dark");
    expect(btn).toHaveAttribute("title", "Mode terang");
  });

  it("tanpa simpanan → ikut preferensi sistem", () => {
    mockSystemDark(true);
    renderToggle();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("toggle mengganti kelas dan menyimpan pilihan", async () => {
    const btn = renderToggle();
    expect(document.documentElement).not.toHaveClass("dark");
    await userEvent.click(btn);
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("aigt-theme")).toBe("dark");
    expect(btn).toHaveAttribute("title", "Mode terang");
    await userEvent.click(btn);
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("aigt-theme")).toBe("light");
  });
});
