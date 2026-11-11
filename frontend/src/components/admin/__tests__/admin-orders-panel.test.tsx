import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminOrdersPanel } from "../AdminOrdersPanel";
import type { AdminOrder } from "@/api/adminApi";

const listOrders = vi.fn();

vi.mock("@/api/adminApi", () => ({
  adminApi: {
    listOrders: (...a: unknown[]) => listOrders(...a),
    confirmOrder: vi.fn(),
    rejectOrder: vi.fn(),
    proofBlob: vi.fn().mockResolvedValue(new Blob()),
  },
}));

vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }));

function order(id: string, over: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id,
    user: { id: "u1", email: `${id}@example.com`, name: `User ${id}` },
    kind: "plan", item_id: "pro", item_name: "Pro",
    amount: 99000, unique_code: 123, total_amount: 99123,
    status: "awaiting_verification", has_proof: true,
    created_at: "2026-10-01T03:00:00Z", expires_at: null, paid_at: null,
    rejection_reason: null, reviewed_by: null, reviewed_at: null,
    ...over,
  };
}

describe("AdminOrdersPanel (A-3)", () => {
  beforeEach(() => {
    listOrders.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
  });

  it("default memuat order yang menunggu verifikasi", async () => {
    listOrders.mockResolvedValue({ items: [order("a")], total: 1 });
    render(<AdminOrdersPanel />);

    await waitFor(() => expect(screen.getByText("a@example.com")).toBeInTheDocument());
    expect(listOrders).toHaveBeenCalledWith({ status: "awaiting_verification", limit: 20, offset: 0 });
  });

  it("ganti tab status memuat ulang dengan filter baru", async () => {
    listOrders.mockResolvedValue({ items: [], total: 0 });
    render(<AdminOrdersPanel />);
    await waitFor(() => expect(listOrders).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("tab", { name: "Lunas" }));
    await waitFor(() =>
      expect(listOrders).toHaveBeenLastCalledWith({ status: "paid", limit: 20, offset: 0 }),
    );
  });

  it("menampilkan state kosong yang jelas", async () => {
    listOrders.mockResolvedValue({ items: [], total: 0 });
    render(<AdminOrdersPanel />);
    await waitFor(() => expect(screen.getByText(/Tidak ada order/)).toBeInTheDocument());
  });

  it("menampilkan error saat gagal memuat", async () => {
    listOrders.mockRejectedValue(new Error("boom"));
    render(<AdminOrdersPanel />);
    await waitFor(() => expect(screen.getByText(/Gagal memuat order/)).toBeInTheDocument());
  });

  it("klik baris membuka detail order", async () => {
    listOrders.mockResolvedValue({ items: [order("a")], total: 1 });
    render(<AdminOrdersPanel />);
    await userEvent.click(await screen.findByText("a@example.com"));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Setujui" })).toBeInTheDocument();
  });

  it("paginasi: tombol berikutnya menggeser offset", async () => {
    listOrders.mockResolvedValue({
      items: Array.from({ length: 20 }, (_, i) => order(`o${i}`)),
      total: 25,
    });
    render(<AdminOrdersPanel />);
    await screen.findByText("o0@example.com");

    await userEvent.click(screen.getByRole("button", { name: /Berikutnya/ }));
    await waitFor(() =>
      expect(listOrders).toHaveBeenLastCalledWith({ status: "awaiting_verification", limit: 20, offset: 20 }),
    );
  });
});
