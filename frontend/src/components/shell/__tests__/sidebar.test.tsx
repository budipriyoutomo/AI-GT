import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Sidebar } from "../sidebar";

const subscription = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "u1", name: "Budi Priyo", email: "budi@example.com" },
    logout: vi.fn(),
  }),
}));

vi.mock("@/api/billingApi", () => ({
  billingApi: {
    subscription: (...args: unknown[]) => subscription(...args),
  },
}));

function makeSub(historyUsed: number) {
  return {
    plan_id: "starter",
    plan_name: "Starter",
    status: "active",
    current_period_end: null,
    storage_addon_id: null,
    usage: {
      generate_used: 3,
      generate_limit: 20,
      history_used: historyUsed,
      history_limit: 20,
    },
  };
}

describe("Sidebar — badge Riwayat (P2-3)", () => {
  beforeEach(() => {
    subscription.mockReset();
  });

  it("menampilkan jumlah project asli, bukan angka hardcoded", async () => {
    subscription.mockResolvedValue(makeSub(7));
    render(<Sidebar active="dashboard" />);

    await waitFor(() => expect(screen.getByText("7")).toBeInTheDocument());
    expect(screen.queryByText("12")).not.toBeInTheDocument();
  });

  it("tidak menampilkan badge saat user belum punya project", async () => {
    subscription.mockResolvedValue(makeSub(0));
    render(<Sidebar active="dashboard" />);

    await waitFor(() => expect(subscription).toHaveBeenCalled());
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("tidak menampilkan badge saat permintaan gagal (fail-soft)", async () => {
    subscription.mockRejectedValue(new Error("network down"));
    render(<Sidebar active="dashboard" />);

    await waitFor(() => expect(subscription).toHaveBeenCalled());
    expect(screen.getByText("Riwayat")).toBeInTheDocument();
    expect(screen.queryByText("12")).not.toBeInTheDocument();
  });
});

describe("Sidebar — status ciut tersimpan", () => {
  beforeEach(() => {
    localStorage.clear();
    subscription.mockReset().mockResolvedValue(makeSub(1));
  });

  it("default terbuka", () => {
    render(<Sidebar active="dashboard" />);
    expect(screen.getByTitle("Sembunyikan sidebar")).toBeInTheDocument();
  });

  it("memulihkan status ciut dari localStorage", () => {
    localStorage.setItem("sidebar-collapsed", "true");
    render(<Sidebar active="dashboard" />);
    expect(screen.getByTitle("Tampilkan sidebar")).toBeInTheDocument();
  });

  it("toggle menyimpan status ke localStorage", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    render(<Sidebar active="dashboard" />);
    await userEvent.click(screen.getByTitle("Sembunyikan sidebar"));
    expect(localStorage.getItem("sidebar-collapsed")).toBe("true");
    expect(screen.getByTitle("Tampilkan sidebar")).toBeInTheDocument();
    await userEvent.click(screen.getByTitle("Tampilkan sidebar"));
    expect(localStorage.getItem("sidebar-collapsed")).toBe("false");
  });
});
