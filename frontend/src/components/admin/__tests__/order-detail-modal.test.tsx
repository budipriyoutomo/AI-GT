import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderDetailModal } from "../OrderDetailModal";
import type { AdminOrder } from "@/api/adminApi";

const confirmOrder = vi.fn();
const rejectOrder = vi.fn();
const proofBlob = vi.fn();
const toastMock = vi.fn();

vi.mock("@/api/adminApi", () => ({
  adminApi: {
    confirmOrder: (...a: unknown[]) => confirmOrder(...a),
    rejectOrder: (...a: unknown[]) => rejectOrder(...a),
    proofBlob: (...a: unknown[]) => proofBlob(...a),
  },
}));

vi.mock("@/components/ui/toast", () => ({
  toast: (...a: unknown[]) => toastMock(...a),
}));

const ORDER: AdminOrder = {
  id: "o1",
  user: { id: "u1", email: "budi@example.com", name: "Budi" },
  kind: "plan",
  item_id: "pro",
  item_name: "Pro",
  amount: 99000,
  unique_code: 123,
  total_amount: 99123,
  status: "awaiting_verification",
  has_proof: true,
  created_at: "2026-10-01T03:00:00Z",
  expires_at: null,
  paid_at: null,
  rejection_reason: null,
  reviewed_by: null,
  reviewed_at: null,
};

describe("OrderDetailModal (A-3)", () => {
  beforeEach(() => {
    confirmOrder.mockReset();
    rejectOrder.mockReset();
    proofBlob.mockReset().mockResolvedValue(new Blob(["x"], { type: "image/png" }));
    toastMock.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:proof");
    URL.revokeObjectURL = vi.fn();
  });

  it("menampilkan pemilik, nominal unik, dan bukti transfer lewat blob ber-auth", async () => {
    render(<OrderDetailModal order={ORDER} onClose={() => {}} onReviewed={() => {}} />);

    expect(screen.getByText("budi@example.com")).toBeInTheDocument();
    expect(screen.getByText(/99\.123/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByAltText("Bukti transfer")).toHaveAttribute("src", "blob:proof"),
    );
    expect(proofBlob).toHaveBeenCalledWith("o1");
  });

  it("tidak meminta bukti saat order tidak punya bukti", () => {
    render(
      <OrderDetailModal order={{ ...ORDER, has_proof: false, status: "pending" }} onClose={() => {}} onReviewed={() => {}} />,
    );
    expect(proofBlob).not.toHaveBeenCalled();
    expect(screen.getByText(/belum mengunggah bukti/i)).toBeInTheDocument();
  });

  it("setujui butuh konfirmasi kedua sebelum memanggil API", async () => {
    const onReviewed = vi.fn();
    confirmOrder.mockResolvedValue({ ...ORDER, status: "paid" });
    render(<OrderDetailModal order={ORDER} onClose={() => {}} onReviewed={onReviewed} />);

    await userEvent.click(screen.getByRole("button", { name: "Setujui" }));
    expect(confirmOrder).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Ya, aktifkan/ }));
    await waitFor(() => expect(confirmOrder).toHaveBeenCalledWith("o1"));
    expect(onReviewed).toHaveBeenCalledWith(expect.objectContaining({ status: "paid" }));
  });

  it("tolak wajib alasan, lalu mengirim alasan ke API", async () => {
    const onReviewed = vi.fn();
    rejectOrder.mockResolvedValue({ ...ORDER, status: "rejected", rejection_reason: "Nominal beda" });
    render(<OrderDetailModal order={ORDER} onClose={() => {}} onReviewed={onReviewed} />);

    await userEvent.click(screen.getByRole("button", { name: "Tolak" }));
    const submit = screen.getByRole("button", { name: "Kirim penolakan" });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Alasan penolakan"), "Nominal beda");
    await userEvent.click(submit);

    await waitFor(() => expect(rejectOrder).toHaveBeenCalledWith("o1", "Nominal beda"));
    expect(onReviewed).toHaveBeenCalledWith(expect.objectContaining({ status: "rejected" }));
  });

  it("menampilkan error dari backend tanpa menutup modal", async () => {
    const onReviewed = vi.fn();
    confirmOrder.mockRejectedValue(new Error("Order berstatus 'paid' tidak bisa ditinjau lagi."));
    render(<OrderDetailModal order={ORDER} onClose={() => {}} onReviewed={onReviewed} />);

    await userEvent.click(screen.getByRole("button", { name: "Setujui" }));
    await userEvent.click(screen.getByRole("button", { name: /Ya, aktifkan/ }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" })),
    );
    expect(onReviewed).not.toHaveBeenCalled();
  });

  it("order yang sudah ditinjau tidak punya tombol aksi, tapi menampilkan jejak peninjau", () => {
    render(
      <OrderDetailModal
        order={{
          ...ORDER,
          status: "rejected",
          rejection_reason: "Bukti buram",
          reviewed_by: { id: "a1", email: "admin@example.com", name: "Admin" },
          reviewed_at: "2026-10-02T03:00:00Z",
        }}
        onClose={() => {}}
        onReviewed={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: "Setujui" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tolak" })).not.toBeInTheDocument();
    expect(screen.getByText("Bukti buram")).toBeInTheDocument();
    expect(screen.getByText(/admin@example\.com/)).toBeInTheDocument();
  });
});
