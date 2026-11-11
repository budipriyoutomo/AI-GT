import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryPage from "../page";

vi.mock("@/components/shell/shell", () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/history/HistoryCard", () => ({
  HistoryCard: ({ project }: { project: { title: string } }) => <div data-testid="history-card">{project.title}</div>,
}));

vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }));

const listProjects = vi.fn();
vi.mock("@/api/projectsApi", () => ({
  projectsApi: { list: (...a: unknown[]) => listProjects(...a) },
}));

const getSubscription = vi.fn();
vi.mock("@/api/billingApi", () => ({
  billingApi: { subscription: (...a: unknown[]) => getSubscription(...a) },
}));

const sub = (generate_used: number, generate_limit = 5) => ({
  plan_id: "starter", plan_name: "Starter", status: "active", current_period_end: null, storage_addon_id: null,
  usage: { generate_used, generate_limit, history_used: 0, history_limit: 20 },
});

const project = { id: "p1", title: "Promo Lebaran", created_at: "2026-10-01T00:00:00Z", exported_url: null, final_config: {} };

describe("/history — empty, error, dan kuota habis (P3-1)", () => {
  beforeEach(() => {
    listProjects.mockReset();
    getSubscription.mockReset().mockResolvedValue(sub(1));
  });

  it("gagal memuat → error state dengan Coba lagi, bukan 'Belum ada konten'", async () => {
    listProjects.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce([project]);
    render(<HistoryPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat riwayat");
    expect(screen.queryByText("Belum ada konten")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /coba lagi/i }));
    expect(await screen.findByTestId("history-card")).toHaveTextContent("Promo Lebaran");
    expect(listProjects).toHaveBeenCalledTimes(2);
  });

  it("kosong + kuota masih ada → CTA buat konten pertama", async () => {
    listProjects.mockResolvedValue([]);
    render(<HistoryPage />);
    expect(await screen.findByText("Belum ada konten")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buat konten pertama/i })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("kuota habis → banner upgrade, dan empty state tidak mengajak generate", async () => {
    listProjects.mockResolvedValue([]);
    getSubscription.mockResolvedValue(sub(5));
    render(<HistoryPage />);

    expect(await screen.findByRole("status")).toHaveTextContent("Kuota generate bulan ini habis");
    expect(screen.queryByRole("button", { name: /buat konten pertama/i })).not.toBeInTheDocument();
  });

  it("gagal memuat kuota tidak memblokir halaman", async () => {
    listProjects.mockResolvedValue([project]);
    getSubscription.mockRejectedValue(new Error("down"));
    render(<HistoryPage />);
    expect(await screen.findByTestId("history-card")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
