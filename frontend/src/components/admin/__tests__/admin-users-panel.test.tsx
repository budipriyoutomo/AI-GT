import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminUsersPanel } from "../AdminUsersPanel";
import type { AdminUserDetail, AdminUserListItem } from "@/api/adminApi";

const listUsers = vi.fn();
const getUser = vi.fn();
const suspendUser = vi.fn();
const unsuspendUser = vi.fn();
const deleteUser = vi.fn();
const toastMock = vi.fn();

vi.mock("@/api/adminApi", () => ({
  adminApi: {
    listUsers: (...a: unknown[]) => listUsers(...a),
    getUser: (...a: unknown[]) => getUser(...a),
    suspendUser: (...a: unknown[]) => suspendUser(...a),
    unsuspendUser: (...a: unknown[]) => unsuspendUser(...a),
    deleteUser: (...a: unknown[]) => deleteUser(...a),
  },
}));

vi.mock("@/components/ui/toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));

function item(id: string, over: Partial<AdminUserListItem> = {}): AdminUserListItem {
  return {
    id, email: `${id}@example.com`, name: `User ${id}`, role: "user", is_active: true,
    plan_id: "starter", business_name: `Toko ${id}`, created_at: "2026-10-01T03:00:00Z",
    ...over,
  };
}

function detail(id: string, over: Partial<AdminUserDetail> = {}): AdminUserDetail {
  return {
    id, email: `${id}@example.com`, name: `User ${id}`, role: "user", is_active: true,
    suspended_at: null, suspended_reason: null, created_at: "2026-10-01T03:00:00Z",
    company_profile: { business_name: `Toko ${id}`, industry: "fnb", logo_url: null },
    subscription: { plan_id: "pro", plan_name: "Pro", status: "active", storage_addon_id: null, current_period_end: "2026-11-01T00:00:00Z" },
    usage: { generate_used: 12, generate_limit: 80, history_used: 5, history_limit: 50 },
    ...over,
  };
}

const firstCall = { q: "", plan: "", status: "all", limit: 20, offset: 0 };

describe("AdminUsersPanel (A-4)", () => {
  beforeEach(() => {
    [listUsers, getUser, suspendUser, unsuspendUser, deleteUser, toastMock].forEach((m) => m.mockReset());
  });

  it("memuat daftar user dengan paket dan nama bisnis", async () => {
    listUsers.mockResolvedValue({ items: [item("a", { plan_id: "pro" })], total: 1 });
    render(<AdminUsersPanel />);

    expect(await screen.findByText("a@example.com")).toBeInTheDocument();
    expect(screen.getByText("Toko a")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Pro" })).toBeInTheDocument();
    expect(listUsers).toHaveBeenCalledWith(firstCall);
  });

  it("pencarian dikirim saat form disubmit dan mereset offset", async () => {
    listUsers.mockResolvedValue({ items: [], total: 0 });
    render(<AdminUsersPanel />);
    await waitFor(() => expect(listUsers).toHaveBeenCalledTimes(1));

    await userEvent.type(screen.getByLabelText("Cari user"), "siti{enter}");
    await waitFor(() => expect(listUsers).toHaveBeenLastCalledWith({ ...firstCall, q: "siti" }));
  });

  it("filter paket dan status", async () => {
    listUsers.mockResolvedValue({ items: [], total: 0 });
    render(<AdminUsersPanel />);
    await waitFor(() => expect(listUsers).toHaveBeenCalledTimes(1));

    await userEvent.selectOptions(screen.getByLabelText("Filter paket"), "Business");
    await waitFor(() => expect(listUsers).toHaveBeenLastCalledWith({ ...firstCall, plan: "business" }));

    await userEvent.click(screen.getByRole("tab", { name: "Disuspend" }));
    await waitFor(() =>
      expect(listUsers).toHaveBeenLastCalledWith({ ...firstCall, plan: "business", status: "suspended" }),
    );
  });

  it("state kosong dan error", async () => {
    listUsers.mockResolvedValueOnce({ items: [], total: 0 });
    const { unmount } = render(<AdminUsersPanel />);
    expect(await screen.findByText(/Tidak ada user/)).toBeInTheDocument();
    unmount();

    listUsers.mockRejectedValueOnce(new Error("boom"));
    render(<AdminUsersPanel />);
    expect(await screen.findByText(/Gagal memuat user/)).toBeInTheDocument();
  });

  it("klik baris membuka detail: profil, langganan, pemakaian kuota", async () => {
    listUsers.mockResolvedValue({ items: [item("a")], total: 1 });
    getUser.mockResolvedValue(detail("a"));
    render(<AdminUsersPanel />);

    await userEvent.click(await screen.findByText("a@example.com"));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(within(dialog).getByText("12 / 80")).toBeInTheDocument());
    expect(within(dialog).getByText("5 / 50")).toBeInTheDocument();
    expect(within(dialog).getByText("Pro")).toBeInTheDocument();
    expect(getUser).toHaveBeenCalledWith("a");
  });

  it("suspend wajib alasan lalu mengirimnya, dan daftar dimuat ulang", async () => {
    listUsers.mockResolvedValue({ items: [item("a")], total: 1 });
    getUser.mockResolvedValue(detail("a"));
    suspendUser.mockResolvedValue(detail("a", { is_active: false, suspended_reason: "Spam" }));
    render(<AdminUsersPanel />);

    await userEvent.click(await screen.findByText("a@example.com"));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(await within(dialog).findByRole("button", { name: "Suspend" }));

    const submit = within(dialog).getByRole("button", { name: "Suspend sekarang" });
    expect(submit).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText("Alasan suspend"), "Spam");
    await userEvent.click(submit);

    await waitFor(() => expect(suspendUser).toHaveBeenCalledWith("a", "Spam"));
    await waitFor(() => expect(listUsers).toHaveBeenCalledTimes(2));
    expect(await within(dialog).findByText("Spam")).toBeInTheDocument();
  });

  it("user tersuspend bisa diaktifkan lagi", async () => {
    listUsers.mockResolvedValue({ items: [item("a", { is_active: false })], total: 1 });
    getUser.mockResolvedValue(detail("a", { is_active: false, suspended_reason: "Spam", suspended_at: "2026-10-02T00:00:00Z" }));
    unsuspendUser.mockResolvedValue(detail("a"));
    render(<AdminUsersPanel />);

    await userEvent.click(await screen.findByText("a@example.com"));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(await within(dialog).findByRole("button", { name: "Aktifkan lagi" }));
    await waitFor(() => expect(unsuspendUser).toHaveBeenCalledWith("a"));
  });

  it("hapus user wajib mengetik ulang email, lalu menutup detail", async () => {
    listUsers.mockResolvedValue({ items: [item("a")], total: 1 });
    getUser.mockResolvedValue(detail("a"));
    deleteUser.mockResolvedValue(null);
    render(<AdminUsersPanel />);

    await userEvent.click(await screen.findByText("a@example.com"));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(await within(dialog).findByRole("button", { name: "Hapus user" }));

    const submit = within(dialog).getByRole("button", { name: "Hapus permanen" });
    await userEvent.type(within(dialog).getByLabelText("Ketik email user untuk konfirmasi"), "salah@example.com");
    expect(submit).toBeDisabled();

    await userEvent.clear(within(dialog).getByLabelText("Ketik email user untuk konfirmasi"));
    await userEvent.type(within(dialog).getByLabelText("Ketik email user untuk konfirmasi"), "A@example.com");
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith("a", "A@example.com"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("aksi ditolak backend (mis. hierarki admin) tampil sebagai toast error", async () => {
    listUsers.mockResolvedValue({ items: [item("a")], total: 1 });
    getUser.mockResolvedValue(detail("a", { role: "admin" }));
    suspendUser.mockRejectedValue(new Error("Hanya superadmin yang bisa menindak akun admin."));
    render(<AdminUsersPanel />);

    await userEvent.click(await screen.findByText("a@example.com"));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(await within(dialog).findByRole("button", { name: "Suspend" }));
    await userEvent.type(within(dialog).getByLabelText("Alasan suspend"), "x");
    await userEvent.click(within(dialog).getByRole("button", { name: "Suspend sekarang" }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" })),
    );
  });

  it("akun superadmin tidak menampilkan aksi apa pun", async () => {
    listUsers.mockResolvedValue({ items: [item("a", { role: "superadmin" })], total: 1 });
    getUser.mockResolvedValue(detail("a", { role: "superadmin" }));
    render(<AdminUsersPanel />);

    await userEvent.click(await screen.findByText("a@example.com"));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("12 / 80");
    expect(within(dialog).queryByRole("button", { name: "Suspend" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Hapus user" })).not.toBeInTheDocument();
  });
});
