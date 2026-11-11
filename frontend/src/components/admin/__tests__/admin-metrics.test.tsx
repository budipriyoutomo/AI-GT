import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminMetricsDashboard } from "../AdminMetricsDashboard";
import { GenerateTrendChart } from "../GenerateTrendChart";
import { AdminSessionsPanel } from "../AdminSessionsPanel";
import type { AdminMetrics, AdminSession } from "@/api/adminApi";

const getMetrics = vi.fn();
const listSessions = vi.fn();

vi.mock("@/api/adminApi", () => ({
  adminApi: {
    getMetrics: (...a: unknown[]) => getMetrics(...a),
    listSessions: (...a: unknown[]) => listSessions(...a),
  },
}));

function daily(n = 30) {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, "0")}`,
    completed: i === n - 1 ? 7 : 0,
    failed: i === n - 1 ? 2 : 0,
  }));
}

function metrics(over: Partial<AdminMetrics> = {}): AdminMetrics {
  return {
    users: { total: 1284, new_7d: 12, new_30d: 40, suspended: 3 },
    generate: {
      this_month: 512,
      last_30d: { total: 600, completed: 540, failed: 54, processing: 6 },
      success_rate_30d: 0.9091,
    },
    revenue: { this_month: 348579, paid_orders_this_month: 2 },
    pending: { orders_awaiting_verification: 4, messages_unread: 2 },
    daily: daily(),
    ...over,
  };
}

describe("AdminMetricsDashboard (A-8)", () => {
  beforeEach(() => { getMetrics.mockReset(); listSessions.mockReset().mockResolvedValue({ items: [], total: 0 }); });

  it("menampilkan stat tile utama", async () => {
    getMetrics.mockResolvedValue(metrics());
    render(<AdminMetricsDashboard />);

    expect(await screen.findByText("1.284")).toBeInTheDocument();
    expect(screen.getByText(/12 baru 7 hari/)).toBeInTheDocument();
    expect(screen.getByText("512")).toBeInTheDocument();
    expect(screen.getByText("90,9%")).toBeInTheDocument();
    expect(screen.getByText("Rp 348.579")).toBeInTheDocument();
  });

  it("tingkat keberhasilan tanpa data tampil sebagai —, bukan 0%", async () => {
    getMetrics.mockResolvedValue(metrics({
      generate: { this_month: 0, last_30d: { total: 0, completed: 0, failed: 0, processing: 0 }, success_rate_30d: null },
    }));
    render(<AdminMetricsDashboard />);
    const tile = (await screen.findByText("Keberhasilan generate")).closest("[data-tile]") as HTMLElement;
    expect(within(tile).getByText("—")).toBeInTheDocument();
  });

  it("pekerjaan tertunda menaut ke halaman terkait", async () => {
    getMetrics.mockResolvedValue(metrics());
    render(<AdminMetricsDashboard />);
    expect(await screen.findByRole("link", { name: /4 order menunggu verifikasi/ })).toHaveAttribute("href", "/admin/orders");
    expect(screen.getByRole("link", { name: /2 pesan baru/ })).toHaveAttribute("href", "/admin/messages");
  });

  it("error memuat metrik", async () => {
    getMetrics.mockRejectedValue(new Error("boom"));
    render(<AdminMetricsDashboard />);
    expect(await screen.findByText(/Gagal memuat metrik/)).toBeInTheDocument();
  });
});

describe("GenerateTrendChart (A-8)", () => {
  it("punya legenda untuk dua seri dan label aksesibel", () => {
    render(<GenerateTrendChart daily={daily()} />);
    const legend = screen.getByTestId("trend-legend");
    expect(within(legend).getByText("Berhasil")).toBeInTheDocument();
    expect(within(legend).getByText("Gagal")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Tren generate harian 30 hari/ })).toBeInTheDocument();
  });

  it("hover kolom menampilkan tooltip tanggal + angka", () => {
    render(<GenerateTrendChart daily={daily()} />);
    fireEvent.mouseEnter(screen.getByTestId("trend-col-2026-09-30"));
    const tip = screen.getByRole("tooltip");
    expect(within(tip).getByText(/30 Sep/)).toBeInTheDocument();
    expect(within(tip).getByText(/Berhasil: 7/)).toBeInTheDocument();
    expect(within(tip).getByText(/Gagal: 2/)).toBeInTheDocument();
  });

  it("nilai tidak dikunci di tooltip — tersedia sebagai tabel", async () => {
    render(<GenerateTrendChart daily={daily()} />);
    await userEvent.click(screen.getByRole("button", { name: "Lihat sebagai tabel" }));
    const table = screen.getByRole("table");
    const row = within(table).getByRole("row", { name: /30 Sep/ });
    expect(within(row).getByText("7")).toBeInTheDocument();
    expect(within(row).getByText("2")).toBeInTheDocument();
  });

  it("tanpa data sama sekali menampilkan pesan, bukan grafik kosong", () => {
    render(<GenerateTrendChart daily={daily().map((d) => ({ ...d, completed: 0, failed: 0 }))} />);
    expect(screen.getByText(/Belum ada generate/)).toBeInTheDocument();
  });
});

function session(id: string, over: Partial<AdminSession> = {}): AdminSession {
  return {
    id, user: { id: "u1", email: `${id}@example.com`, name: "Budi" },
    template_name: "Promo Lebaran", status: "failed", goal: "promo", platform: "instagram_feed",
    error_reason: "copy_timeout", error_message: "timeout 30s", created_at: "2026-10-01T03:00:00Z",
    ...over,
  };
}

describe("AdminSessionsPanel (A-8)", () => {
  beforeEach(() => { listSessions.mockReset(); });

  it("default memuat session gagal dengan alasan yang bisa dibaca", async () => {
    listSessions.mockResolvedValue({ items: [session("a")], total: 1 });
    render(<AdminSessionsPanel />);
    expect(await screen.findByText("a@example.com")).toBeInTheDocument();
    expect(screen.getByText("AI copy timeout")).toBeInTheDocument();
    expect(screen.getByText("timeout 30s")).toBeInTheDocument();
    expect(listSessions).toHaveBeenCalledWith({ status: "failed", limit: 10, offset: 0 });
  });

  it("tab Sedang diproses memuat ulang", async () => {
    listSessions.mockResolvedValue({ items: [], total: 0 });
    render(<AdminSessionsPanel />);
    await waitFor(() => expect(listSessions).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("tab", { name: "Sedang diproses" }));
    await waitFor(() => expect(listSessions).toHaveBeenLastCalledWith({ status: "processing", limit: 10, offset: 0 }));
  });

  it("state kosong", async () => {
    listSessions.mockResolvedValue({ items: [], total: 0 });
    render(<AdminSessionsPanel />);
    expect(await screen.findByText(/Tidak ada session/)).toBeInTheDocument();
  });
});
