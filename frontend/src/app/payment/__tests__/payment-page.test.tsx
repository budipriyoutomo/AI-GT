import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import PaymentPage from "../page";
import type { Order } from "@/api/billingApi";

const orderMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("orderId=o1"),
}));
vi.mock("@/components/shell/shell", () => ({
  Shell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }));
vi.mock("@/api/billingApi", () => ({
  billingApi: {
    order: (...a: unknown[]) => orderMock(...a),
    uploadProof: vi.fn(),
  },
}));

const BASE: Order = {
  id: "o1", kind: "plan", item_id: "pro", item_name: "Pro",
  amount: 99000, unique_code: 123, total_amount: 99123,
  status: "pending", proof_url: null,
  bank: { bank_name: "BCA", account_number: "123", account_holder: "PT AI-GT" },
  created_at: "2026-10-01T03:00:00Z", expires_at: null, paid_at: null,
  rejection_reason: null,
};

describe("Halaman pembayaran — order yang sudah ditutup (A-3)", () => {
  beforeEach(() => { orderMock.mockReset(); });

  it("order ditolak menampilkan alasan admin dan tidak menawarkan upload", async () => {
    orderMock.mockResolvedValue({ ...BASE, status: "rejected", rejection_reason: "Nominal transfer tidak sesuai" });
    render(<PaymentPage />);

    expect(await screen.findByText("Nominal transfer tidak sesuai")).toBeInTheDocument();
    expect(screen.getByText("Ditolak")).toBeInTheDocument();
    expect(screen.queryByText(/Klik untuk unggah bukti transfer/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Buat order baru/ })).toHaveAttribute("href", "/subscription");
  });

  it("order kadaluarsa tidak menawarkan upload", async () => {
    orderMock.mockResolvedValue({ ...BASE, status: "expired" });
    render(<PaymentPage />);

    expect(await screen.findByText("Kadaluarsa")).toBeInTheDocument();
    expect(screen.queryByText(/Klik untuk unggah bukti transfer/)).not.toBeInTheDocument();
  });

  it("order pending tetap menampilkan instruksi transfer & upload", async () => {
    orderMock.mockResolvedValue(BASE);
    render(<PaymentPage />);

    expect(await screen.findByText(/Klik untuk unggah bukti transfer/)).toBeInTheDocument();
  });
});
