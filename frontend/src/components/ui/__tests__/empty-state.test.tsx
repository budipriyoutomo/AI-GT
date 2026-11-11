import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState, LoadErrorState } from "../empty-state";

describe("EmptyState", () => {
  it("menampilkan judul, deskripsi, dan aksi", () => {
    render(<EmptyState icon="folder-open" title="Belum ada konten" desc="Mulai dari galeri." action={<button>Buat</button>} />);
    expect(screen.getByText("Belum ada konten")).toBeInTheDocument();
    expect(screen.getByText("Mulai dari galeri.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buat" })).toBeInTheDocument();
  });
});

describe("LoadErrorState", () => {
  it("diumumkan sebagai alert dan tombol Coba lagi memanggil onRetry", async () => {
    const onRetry = vi.fn();
    render(<LoadErrorState title="Gagal memuat riwayat" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat riwayat");
    await userEvent.click(screen.getByRole("button", { name: /coba lagi/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
