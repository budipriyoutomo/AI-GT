import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "../page";

vi.mock("@/components/shell/shell", () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/poster-thumb", () => ({ PosterThumb: () => null }));
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { name: "Budi Utomo" } }) }));

const listProjects = vi.fn();
vi.mock("@/api/projectsApi", () => ({
  projectsApi: { list: (...a: unknown[]) => listProjects(...a), delete: vi.fn() },
}));

const getSubscription = vi.fn();
vi.mock("@/api/billingApi", () => ({
  billingApi: { subscription: (...a: unknown[]) => getSubscription(...a) },
}));

const sub = (generate_used: number, generate_limit = 5) => ({
  plan_id: "starter", plan_name: "Starter", status: "active", current_period_end: null, storage_addon_id: null,
  usage: { generate_used, generate_limit, history_used: 0, history_limit: 20 },
});

describe("/dashboard — empty, error, dan kuota habis (P3-1)", () => {
  beforeEach(() => {
    listProjects.mockReset();
    getSubscription.mockReset().mockResolvedValue(sub(1));
  });

  it("gagal memuat → error state dengan Coba lagi", async () => {
    listProjects.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce([]);
    render(<DashboardPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat konten");
    expect(screen.queryByText(/belum ada konten/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /coba lagi/i }));
    expect(await screen.findByText(/belum ada konten/i)).toBeInTheDocument();
    expect(listProjects).toHaveBeenCalledTimes(2);
  });

  it("kosong + kuota ada → CTA Buat konten", async () => {
    listProjects.mockResolvedValue([]);
    render(<DashboardPage />);
    expect(await screen.findByRole("button", { name: /buat konten/i })).toBeInTheDocument();
  });

  it("kuota habis → banner upgrade, CTA generate disembunyikan", async () => {
    listProjects.mockResolvedValue([]);
    getSubscription.mockResolvedValue(sub(5));
    render(<DashboardPage />);

    expect(await screen.findByRole("status")).toHaveTextContent("Kuota generate bulan ini habis");
    expect(screen.queryByRole("button", { name: /^buat konten$/i })).not.toBeInTheDocument();
  });
});
