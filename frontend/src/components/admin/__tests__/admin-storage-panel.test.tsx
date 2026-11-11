import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminStoragePanel, formatBytes } from "../AdminStoragePanel";
import type { JobOverview, JobRun, StorageUsage } from "@/api/adminApi";

const listJobs = vi.fn();
const runJob = vi.fn();
const getStorageUsage = vi.fn();
const toastMock = vi.fn();

vi.mock("@/api/adminApi", () => ({
  adminApi: {
    listJobs: (...a: unknown[]) => listJobs(...a),
    runJob: (...a: unknown[]) => runJob(...a),
    getStorageUsage: (...a: unknown[]) => getStorageUsage(...a),
  },
}));
vi.mock("@/components/ui/toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));

function run(over: Partial<JobRun> = {}): JobRun {
  return {
    id: "r1", job_name: "cleanup_temp", trigger: "schedule", triggered_by_email: null,
    status: "success", result: { files_deleted: 3 }, error_message: null,
    started_at: "2026-10-05T03:00:00Z", finished_at: "2026-10-05T03:00:02Z",
    ...over,
  };
}

function overview(over: Partial<JobOverview> = {}): JobOverview {
  return {
    jobs: [
      { name: "cleanup_temp", label: "Hapus file temp R2", interval_minutes: 30,
        last_run: run(), last_success: run() },
      { name: "billing_maintenance", label: "Billing maintenance", interval_minutes: 30,
        last_run: null, last_success: null },
    ],
    recent: [run()],
    ...over,
  };
}

const USAGE: StorageUsage = {
  prefixes: [
    { prefix: "permanent/exported", objects: 10, bytes: 5 * 1024 * 1024 },
    { prefix: "temp/thematic-images", objects: 2, bytes: 2048 },
  ],
  top_users: [
    { user_id: "u1", objects: 8, bytes: 4 * 1024 * 1024, user: { id: "u1", email: "budi@example.com", name: "Budi" } },
    { user_id: "u-ghost", objects: 2, bytes: 1024, user: null },
  ],
  total_objects: 12,
  total_bytes: 5 * 1024 * 1024 + 2048,
  truncated: false,
  scanned_at: "2026-10-05T03:10:00Z",
};

describe("formatBytes", () => {
  it("memformat ukuran manusiawi", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1,5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
  });
});

describe("AdminStoragePanel (A-10)", () => {
  beforeEach(() => {
    [listJobs, runJob, getStorageUsage, toastMock].forEach((m) => m.mockReset());
    listJobs.mockResolvedValue(overview());
  });

  it("menampilkan status tiap job: terakhir jalan & hasil", async () => {
    render(<AdminStoragePanel />);
    const card = (await screen.findByText("Hapus file temp R2")).closest("[data-job]") as HTMLElement;
    expect(within(card).getByText("Berhasil")).toBeInTheDocument();
    expect(within(card).getByText(/3 file dihapus/)).toBeInTheDocument();
    expect(within(card).getByText(/setiap 30 menit/)).toBeInTheDocument();

    const billing = screen.getByText("Billing maintenance").closest("[data-job]") as HTMLElement;
    expect(within(billing).getByText(/Belum pernah jalan/)).toBeInTheDocument();
  });

  it("run terakhir gagal menampilkan error & kapan terakhir berhasil", async () => {
    listJobs.mockResolvedValue(overview({
      jobs: [{
        name: "cleanup_temp", label: "Hapus file temp R2", interval_minutes: 30,
        last_run: run({ id: "r2", status: "failed", result: null, error_message: "R2 down" }),
        last_success: run(),
      }],
    }));
    render(<AdminStoragePanel />);
    const card = (await screen.findByText("Hapus file temp R2")).closest("[data-job]") as HTMLElement;
    expect(within(card).getByText("Gagal")).toBeInTheDocument();
    expect(within(card).getByText("R2 down")).toBeInTheDocument();
    expect(within(card).getByText(/Terakhir berhasil/)).toBeInTheDocument();
  });

  it("jalankan manual lalu memuat ulang status", async () => {
    runJob.mockResolvedValue(run({ trigger: "manual", triggered_by_email: "admin@example.com" }));
    render(<AdminStoragePanel />);
    const card = (await screen.findByText("Hapus file temp R2")).closest("[data-job]") as HTMLElement;

    await userEvent.click(within(card).getByRole("button", { name: "Jalankan sekarang" }));
    await waitFor(() => expect(runJob).toHaveBeenCalledWith("cleanup_temp"));
    await waitFor(() => expect(listJobs).toHaveBeenCalledTimes(2));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
  });

  it("run manual yang gagal di sisi job ditampilkan sebagai toast error", async () => {
    runJob.mockResolvedValue(run({ status: "failed", error_message: "R2 down", result: null }));
    render(<AdminStoragePanel />);
    const card = (await screen.findByText("Hapus file temp R2")).closest("[data-job]") as HTMLElement;
    await userEvent.click(within(card).getByRole("button", { name: "Jalankan sekarang" }));
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: "error", desc: "R2 down" })),
    );
  });

  it("pemindaian storage hanya berjalan saat diminta (mahal)", async () => {
    getStorageUsage.mockResolvedValue(USAGE);
    render(<AdminStoragePanel />);
    await screen.findByText("Hapus file temp R2");
    expect(getStorageUsage).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Pindai storage" }));
    expect(await screen.findByText("permanent/exported")).toBeInTheDocument();
    expect(screen.getByText("budi@example.com")).toBeInTheDocument();
    expect(screen.getByText(/File yatim/)).toBeInTheDocument();
    expect(screen.getAllByText("5 MB").length).toBeGreaterThan(0);
  });

  it("hasil terpotong diberi peringatan", async () => {
    getStorageUsage.mockResolvedValue({ ...USAGE, truncated: true });
    render(<AdminStoragePanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Pindai storage" }));
    expect(await screen.findByText(/hanya sebagian objek/)).toBeInTheDocument();
  });

  it("pemindaian gagal", async () => {
    getStorageUsage.mockRejectedValue(new Error("Storage tidak bisa dipindai saat ini."));
    render(<AdminStoragePanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Pindai storage" }));
    expect(await screen.findByText("Storage tidak bisa dipindai saat ini.")).toBeInTheDocument();
  });
});
