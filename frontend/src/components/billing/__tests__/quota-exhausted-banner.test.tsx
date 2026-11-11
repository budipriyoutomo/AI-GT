import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuotaExhaustedBanner } from "../QuotaExhaustedBanner";

const usage = (generate_used: number, generate_limit: number) => ({
  generate_used, generate_limit, history_used: 0, history_limit: 20,
});

describe("QuotaExhaustedBanner", () => {
  it("tidak tampil selama kuota masih ada", () => {
    const { container } = render(<QuotaExhaustedBanner usage={usage(2, 5)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("tidak tampil saat data kuota belum ada", () => {
    const { container } = render(<QuotaExhaustedBanner usage={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("tampil saat habis: angka pemakaian + link upgrade ke /subscription", () => {
    render(<QuotaExhaustedBanner usage={usage(5, 5)} />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Kuota generate bulan ini habis");
    expect(banner).toHaveTextContent("5/5");
    expect(screen.getByRole("link", { name: /upgrade paket/i })).toHaveAttribute("href", "/subscription");
  });

  it("force menampilkan banner walau usage belum ada (setelah backend menjawab 429)", () => {
    render(<QuotaExhaustedBanner usage={null} force />);
    expect(screen.getByRole("status")).toHaveTextContent("Kuota generate bulan ini habis");
  });
});
