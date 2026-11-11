import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminAuditPanel } from "../AdminAuditPanel";
import type { AdminAuditLog, AuditLogList } from "@/api/adminApi";

const listAuditLogs = vi.fn();

vi.mock("@/api/adminApi", () => ({
  adminApi: { listAuditLogs: (...a: unknown[]) => listAuditLogs(...a) },
}));

function log(id: string, over: Partial<AdminAuditLog> = {}): AdminAuditLog {
  return {
    id,
    admin: { id: "ad1", email: "admin@example.com" },
    action: "user.suspend",
    target_type: "user",
    target_id: "u1",
    payload: { email: "siti@example.com", reason: "Spam" },
    created_at: "2026-10-01T03:00:00Z",
    ...over,
  };
}

function list(items: AdminAuditLog[], over: Partial<AuditLogList> = {}): AuditLogList {
  return {
    items,
    total: items.length,
    actions: ["order.confirm", "order.reject", "user.suspend", "user.unsuspend", "user.delete"],
    admins: [{ id: "ad1", email: "admin@example.com" }, { id: "ad2", email: "super@example.com" }],
    ...over,
  };
}

const firstCall = { admin_id: "", action: "", date_from: "", date_to: "", limit: 50, offset: 0 };

describe("AdminAuditPanel (A-9)", () => {
  beforeEach(() => { listAuditLogs.mockReset(); });

  it("menampilkan aksi dengan label manusiawi, admin, dan target", async () => {
    listAuditLogs.mockResolvedValue(list([log("l1")]));
    render(<AdminAuditPanel />);

    expect(await screen.findByRole("cell", { name: "Suspend user" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "admin@example.com" })).toBeInTheDocument();
    expect(screen.getByText("siti@example.com")).toBeInTheDocument();
    expect(listAuditLogs).toHaveBeenCalledWith(firstCall);
  });

  it("target pembayaran menampilkan email pemilik order", async () => {
    listAuditLogs.mockResolvedValue(list([log("l1", {
      action: "order.confirm", target_type: "payment_order",
      payload: { user_email: "budi@example.com", item: "plan:pro", total_amount: 99123, previous_status: "awaiting_verification" },
    })]));
    render(<AdminAuditPanel />);
    expect(await screen.findByRole("cell", { name: "Setujui pembayaran" })).toBeInTheDocument();
    expect(screen.getByText("budi@example.com")).toBeInTheDocument();
  });

  it("aksi langganan (A-5) punya label manusiawi", async () => {
    listAuditLogs.mockResolvedValue(list([
      log("l1", { action: "subscription.update", payload: { email: "a@example.com" } }),
      log("l2", { action: "subscription.grant_addon", payload: { email: "b@example.com" } }),
    ]));
    render(<AdminAuditPanel />);
    expect(await screen.findByRole("cell", { name: "Ubah langganan" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Ubah add-on" })).toBeInTheDocument();
  });

  it("admin yang sudah dihapus tetap tampil lewat salinan email", async () => {
    listAuditLogs.mockResolvedValue(list([log("l1", { admin: { id: null, email: "mantan@example.com" } })]));
    render(<AdminAuditPanel />);
    expect(await screen.findByText(/mantan@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/akun dihapus/)).toBeInTheDocument();
  });

  it("filter admin, aksi, dan rentang tanggal dikirim ke API", async () => {
    listAuditLogs.mockResolvedValue(list([]));
    render(<AdminAuditPanel />);
    await waitFor(() => expect(listAuditLogs).toHaveBeenCalledTimes(1));

    await userEvent.selectOptions(screen.getByLabelText("Filter admin"), "super@example.com");
    await waitFor(() => expect(listAuditLogs).toHaveBeenLastCalledWith({ ...firstCall, admin_id: "ad2" }));

    await userEvent.selectOptions(screen.getByLabelText("Filter aksi"), "Hapus user");
    await waitFor(() =>
      expect(listAuditLogs).toHaveBeenLastCalledWith({ ...firstCall, admin_id: "ad2", action: "user.delete" }),
    );

    await userEvent.type(screen.getByLabelText("Dari tanggal"), "2026-09-10");
    await userEvent.type(screen.getByLabelText("Sampai tanggal"), "2026-09-12");
    await waitFor(() =>
      expect(listAuditLogs).toHaveBeenLastCalledWith({
        ...firstCall, admin_id: "ad2", action: "user.delete", date_from: "2026-09-10", date_to: "2026-09-12",
      }),
    );
  });

  it("baris bisa dibuka untuk melihat detail lengkap", async () => {
    listAuditLogs.mockResolvedValue(list([log("l1")]));
    render(<AdminAuditPanel />);
    await userEvent.click(await screen.findByRole("cell", { name: "siti@example.com" }));
    expect(await screen.findByText(/"reason": "Spam"/)).toBeInTheDocument();
  });

  it("state kosong dan error (termasuk pesan validasi dari backend)", async () => {
    listAuditLogs.mockResolvedValueOnce(list([]));
    const { unmount } = render(<AdminAuditPanel />);
    expect(await screen.findByText(/Belum ada aksi/)).toBeInTheDocument();
    unmount();

    listAuditLogs.mockRejectedValueOnce(new Error("date_from harus sebelum date_to."));
    render(<AdminAuditPanel />);
    expect(await screen.findByText(/date_from harus sebelum date_to/)).toBeInTheDocument();
  });
});
