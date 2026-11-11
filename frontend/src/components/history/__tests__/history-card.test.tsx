import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryCard } from "../HistoryCard";
import type { Project } from "@/types/project";

const updateMock = vi.fn();
const deleteMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/api/projectsApi", () => ({
  projectsApi: {
    update: (...args: unknown[]) => updateMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

vi.mock("@/components/ui/toast", () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

const PROJECT: Project = {
  id: "11111111-2222-3333-4444-555555555555",
  user_id: "u1",
  template_id: "tpl-1",
  title: "Promo Kopi Senja",
  final_config: { copy: { headline: "Headline Berbeda", body: "", cta: null } },
  thumbnail_url: null,
  exported_image_url: null,
  created_at: "2026-01-02T03:04:05Z",
  updated_at: "2026-01-02T03:04:05Z",
} as unknown as Project;

describe("HistoryCard — rename (P2-4)", () => {
  beforeEach(() => {
    updateMock.mockReset();
    deleteMock.mockReset();
    toastMock.mockReset();
    updateMock.mockResolvedValue({ ...PROJECT, title: "Judul Baru" });
  });

  it("mengirim judul baru ke PATCH /projects/{id}", async () => {
    const user = userEvent.setup();
    render(<HistoryCard project={PROJECT} onDelete={() => {}} onRenamed={() => {}} />);

    await user.click(screen.getByRole("button", { name: /ubah nama/i }));
    const input = screen.getByRole("textbox", { name: /nama konten/i });
    await user.clear(input);
    await user.type(input, "Judul Baru{Enter}");

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith(PROJECT.id, { title: "Judul Baru" });
  });

  it("memberi tahu induk lewat onRenamed setelah berhasil", async () => {
    const user = userEvent.setup();
    const onRenamed = vi.fn();
    render(<HistoryCard project={PROJECT} onDelete={() => {}} onRenamed={onRenamed} />);

    await user.click(screen.getByRole("button", { name: /ubah nama/i }));
    const input = screen.getByRole("textbox", { name: /nama konten/i });
    await user.clear(input);
    await user.type(input, "Judul Baru{Enter}");

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith(PROJECT.id, "Judul Baru"));
  });

  it("Escape membatalkan dan judul lama tetap tampil", async () => {
    const user = userEvent.setup();
    render(<HistoryCard project={PROJECT} onDelete={() => {}} onRenamed={() => {}} />);

    await user.click(screen.getByRole("button", { name: /ubah nama/i }));
    const input = screen.getByRole("textbox", { name: /nama konten/i });
    await user.clear(input);
    await user.type(input, "Dibatalkan{Escape}");

    expect(updateMock).not.toHaveBeenCalled();
    expect(screen.getByText("Promo Kopi Senja")).toBeInTheDocument();
  });

  it("judul kosong tidak dikirim ke API", async () => {
    const user = userEvent.setup();
    render(<HistoryCard project={PROJECT} onDelete={() => {}} onRenamed={() => {}} />);

    await user.click(screen.getByRole("button", { name: /ubah nama/i }));
    const input = screen.getByRole("textbox", { name: /nama konten/i });
    await user.clear(input);
    await user.type(input, "   {Enter}");

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("mengembalikan judul lama saat API gagal", async () => {
    updateMock.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<HistoryCard project={PROJECT} onDelete={() => {}} onRenamed={() => {}} />);

    await user.click(screen.getByRole("button", { name: /ubah nama/i }));
    const input = screen.getByRole("textbox", { name: /nama konten/i });
    await user.clear(input);
    await user.type(input, "Judul Baru{Enter}");

    await waitFor(() => expect(screen.getByText("Promo Kopi Senja")).toBeInTheDocument());
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" }),
    );
  });
});
