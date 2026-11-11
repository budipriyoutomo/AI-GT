import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminMessagesPanel } from "../AdminMessagesPanel";
import type { AdminMessage } from "@/api/adminApi";

const listMessages = vi.fn();
const updateMessage = vi.fn();
const toastMock = vi.fn();

vi.mock("@/api/adminApi", () => ({
  adminApi: {
    listMessages: (...a: unknown[]) => listMessages(...a),
    updateMessage: (...a: unknown[]) => updateMessage(...a),
  },
}));

vi.mock("@/components/ui/toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));

function msg(id: string, over: Partial<AdminMessage> = {}): AdminMessage {
  return {
    id,
    name: `Pengirim ${id}`,
    email: `${id}@example.com`,
    category: "partnership",
    message: `Isi pesan lengkap ${id} yang cukup panjang untuk dibaca admin.`,
    status: "new",
    created_at: "2026-10-01T03:00:00Z",
    handled_by: null,
    handled_at: null,
    ...over,
  };
}

describe("AdminMessagesPanel (A-7)", () => {
  beforeEach(() => {
    listMessages.mockReset();
    updateMessage.mockReset();
    toastMock.mockReset();
  });

  it("default memuat pesan yang belum selesai, dengan label kategori", async () => {
    listMessages.mockResolvedValue({ items: [msg("a")], total: 1, unread: 1 });
    render(<AdminMessagesPanel />);

    expect(await screen.findByText("Pengirim a")).toBeInTheDocument();
    expect(screen.getByText("Bisnis & Kemitraan")).toBeInTheDocument();
    expect(listMessages).toHaveBeenCalledWith({ status: "open", limit: 20, offset: 0 });
  });

  it("menampilkan jumlah pesan baru di tab", async () => {
    listMessages.mockResolvedValue({ items: [], total: 0, unread: 3 });
    render(<AdminMessagesPanel />);
    expect(await screen.findByRole("tab", { name: "Baru (3)" })).toBeInTheDocument();
  });

  it("membuka pesan baru otomatis menandainya dibaca (tanpa membuka ulang yang sudah selesai)", async () => {
    listMessages.mockResolvedValue({ items: [msg("a")], total: 1, unread: 1 });
    updateMessage.mockResolvedValue(msg("a", { status: "read" }));
    render(<AdminMessagesPanel />);

    await userEvent.click(await screen.findByText("Pengirim a"));
    await waitFor(() =>
      expect(updateMessage).toHaveBeenCalledWith("a", { status: "read", only_if_new: true }),
    );
  });

  it("membuka pesan yang sudah dibaca tidak memanggil API", async () => {
    listMessages.mockResolvedValue({ items: [msg("a", { status: "read" })], total: 1, unread: 0 });
    render(<AdminMessagesPanel />);

    await userEvent.click(await screen.findByText("Pengirim a"));
    expect(screen.getByRole("button", { name: "Tandai selesai" })).toBeInTheDocument();
    expect(updateMessage).not.toHaveBeenCalled();
  });

  it("tandai selesai lalu memuat ulang daftar", async () => {
    listMessages.mockResolvedValue({ items: [msg("a", { status: "read" })], total: 1, unread: 0 });
    updateMessage.mockResolvedValue(msg("a", { status: "handled" }));
    render(<AdminMessagesPanel />);

    await userEvent.click(await screen.findByText("Pengirim a"));
    await userEvent.click(screen.getByRole("button", { name: "Tandai selesai" }));

    await waitFor(() => expect(updateMessage).toHaveBeenCalledWith("a", { status: "handled" }));
    await waitFor(() => expect(listMessages).toHaveBeenCalledTimes(2));
  });

  it("pesan selesai bisa dibuka lagi dan menampilkan siapa yang menangani", async () => {
    listMessages.mockResolvedValue({
      items: [msg("a", {
        status: "handled",
        handled_by: { id: "ad", email: "admin@example.com", name: "Admin" },
        handled_at: "2026-10-02T03:00:00Z",
      })],
      total: 1, unread: 0,
    });
    updateMessage.mockResolvedValue(msg("a", { status: "read" }));
    render(<AdminMessagesPanel />);

    await userEvent.click(await screen.findByText("Pengirim a"));
    expect(screen.getByText(/admin@example\.com/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Buka lagi" }));
    await waitFor(() => expect(updateMessage).toHaveBeenCalledWith("a", { status: "read" }));
  });

  it("tombol balas membuka email ke pengirim", async () => {
    listMessages.mockResolvedValue({ items: [msg("a", { status: "read" })], total: 1, unread: 0 });
    render(<AdminMessagesPanel />);

    await userEvent.click(await screen.findByText("Pengirim a"));
    const reply = screen.getByRole("link", { name: /Balas via email/ });
    expect(reply.getAttribute("href")).toMatch(/^mailto:a@example\.com\?subject=/);
  });

  it("ganti tab memuat ulang dengan filter baru", async () => {
    listMessages.mockResolvedValue({ items: [], total: 0, unread: 0 });
    render(<AdminMessagesPanel />);
    await waitFor(() => expect(listMessages).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("tab", { name: "Selesai" }));
    await waitFor(() =>
      expect(listMessages).toHaveBeenLastCalledWith({ status: "handled", limit: 20, offset: 0 }),
    );
  });

  it("state kosong dan error", async () => {
    listMessages.mockResolvedValueOnce({ items: [], total: 0, unread: 0 });
    const { unmount } = render(<AdminMessagesPanel />);
    expect(await screen.findByText(/Tidak ada pesan/)).toBeInTheDocument();
    unmount();

    listMessages.mockRejectedValueOnce(new Error("boom"));
    render(<AdminMessagesPanel />);
    expect(await screen.findByText(/Gagal memuat pesan/)).toBeInTheDocument();
  });

  it("gagal update menampilkan toast error", async () => {
    listMessages.mockResolvedValue({ items: [msg("a", { status: "read" })], total: 1, unread: 0 });
    updateMessage.mockRejectedValue(new Error("Pesan tidak ditemukan."));
    render(<AdminMessagesPanel />);

    await userEvent.click(await screen.findByText("Pengirim a"));
    await userEvent.click(screen.getByRole("button", { name: "Tandai selesai" }));
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" })),
    );
  });
});
