import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserDetailModal } from "../UserDetailModal";
import type { AdminUserDetail } from "@/api/adminApi";

const getUser = vi.fn();
const updateSubscription = vi.fn();
const grantAddon = vi.fn();
const toastMock = vi.fn();

vi.mock("@/api/adminApi", () => ({
  adminApi: {
    getUser: (...a: unknown[]) => getUser(...a),
    updateSubscription: (...a: unknown[]) => updateSubscription(...a),
    grantAddon: (...a: unknown[]) => grantAddon(...a),
    suspendUser: vi.fn(),
    unsuspendUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

vi.mock("@/components/ui/toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));

function detail(over: Partial<AdminUserDetail> = {}): AdminUserDetail {
  return {
    id: "u1", email: "budi@example.com", name: "Budi", role: "user", is_active: true,
    suspended_at: null, suspended_reason: null, created_at: "2026-10-01T03:00:00Z",
    company_profile: null,
    subscription: { plan_id: "starter", plan_name: "Starter", status: "active", storage_addon_id: null, current_period_end: null },
    usage: { generate_used: 20, generate_limit: 20, history_used: 3, history_limit: 20 },
    ...over,
  };
}

async function openSubscriptionForm(onChanged = vi.fn()) {
  render(<UserDetailModal userId="u1" onClose={() => {}} onChanged={onChanged} />);
  await userEvent.click(await screen.findByRole("button", { name: "Kelola langganan" }));
  return onChanged;
}

describe("UserDetailModal — kelola langganan (A-5)", () => {
  beforeEach(() => {
    [getUser, updateSubscription, grantAddon, toastMock].forEach((m) => m.mockReset());
    getUser.mockResolvedValue(detail());
  });

  it("ganti paket otomatis mencentang & mengunci reset kuota, lalu mengirim plan_id", async () => {
    updateSubscription.mockResolvedValue(detail({
      subscription: { plan_id: "pro", plan_name: "Pro", status: "active", storage_addon_id: null, current_period_end: "2026-11-04T00:00:00Z" },
      usage: { generate_used: 0, generate_limit: 80, history_used: 3, history_limit: 50 },
    }));
    const onChanged = await openSubscriptionForm();

    const reset = screen.getByLabelText(/Reset kuota generate/);
    expect(reset).not.toBeChecked();
    expect(reset).toBeEnabled();

    await userEvent.selectOptions(screen.getByLabelText("Paket"), "Pro");
    expect(reset).toBeChecked();
    expect(reset).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Simpan langganan" }));
    await waitFor(() => expect(updateSubscription).toHaveBeenCalledWith("u1", { plan_id: "pro", reset_quota: true }));
    expect(onChanged).toHaveBeenCalled();
    expect(await screen.findByText("0 / 80")).toBeInTheDocument();
  });

  it("reset kuota saja tanpa ganti paket", async () => {
    updateSubscription.mockResolvedValue(detail());
    await openSubscriptionForm();

    await userEvent.click(screen.getByLabelText(/Reset kuota generate/));
    await userEvent.click(screen.getByRole("button", { name: "Simpan langganan" }));
    await waitFor(() => expect(updateSubscription).toHaveBeenCalledWith("u1", { reset_quota: true }));
  });

  it("perpanjangan hari hanya tersedia untuk paket berbayar", async () => {
    getUser.mockResolvedValue(detail({
      subscription: { plan_id: "pro", plan_name: "Pro", status: "active", storage_addon_id: null, current_period_end: "2026-10-20T00:00:00Z" },
    }));
    updateSubscription.mockResolvedValue(detail());
    await openSubscriptionForm();

    await userEvent.type(screen.getByLabelText("Perpanjang (hari)"), "14");
    await userEvent.click(screen.getByRole("button", { name: "Simpan langganan" }));
    await waitFor(() => expect(updateSubscription).toHaveBeenCalledWith("u1", { extend_days: 14 }));
  });

  it("perpanjangan tidak ditawarkan saat paket hasil akhirnya Starter", async () => {
    await openSubscriptionForm();
    expect(screen.queryByLabelText("Perpanjang (hari)")).not.toBeInTheDocument();
  });

  it("tombol simpan nonaktif selama belum ada perubahan", async () => {
    await openSubscriptionForm();
    expect(screen.getByRole("button", { name: "Simpan langganan" })).toBeDisabled();
  });

  it("beri add-on storage lewat tombol terpisah", async () => {
    grantAddon.mockResolvedValue(detail({
      subscription: { plan_id: "starter", plan_name: "Starter", status: "active", storage_addon_id: "s50", current_period_end: null },
      usage: { generate_used: 20, generate_limit: 20, history_used: 3, history_limit: 70 },
    }));
    await openSubscriptionForm();

    await userEvent.selectOptions(screen.getByLabelText("Add-on storage"), "+50 slot");
    await userEvent.click(screen.getByRole("button", { name: "Terapkan add-on" }));
    await waitFor(() => expect(grantAddon).toHaveBeenCalledWith("u1", "s50"));
  });

  it("cabut add-on mengirim null", async () => {
    getUser.mockResolvedValue(detail({
      subscription: { plan_id: "starter", plan_name: "Starter", status: "active", storage_addon_id: "s200", current_period_end: null },
    }));
    grantAddon.mockResolvedValue(detail());
    await openSubscriptionForm();

    await userEvent.selectOptions(screen.getByLabelText("Add-on storage"), "Tanpa add-on");
    await userEvent.click(screen.getByRole("button", { name: "Terapkan add-on" }));
    await waitFor(() => expect(grantAddon).toHaveBeenCalledWith("u1", null));
  });

  it("error backend tampil sebagai toast", async () => {
    updateSubscription.mockRejectedValue(new Error("Tidak bisa melakukan aksi ini pada akun sendiri."));
    await openSubscriptionForm();
    await userEvent.selectOptions(screen.getByLabelText("Paket"), "Business");
    await userEvent.click(screen.getByRole("button", { name: "Simpan langganan" }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" })));
  });
});
