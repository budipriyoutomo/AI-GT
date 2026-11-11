import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateLab } from "../TemplateLab";
import type { TemplateDraft, TemplateValidation } from "@/api/adminApi";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const getDraft = vi.fn();
const updateDraft = vi.fn();
const validateTemplate = vi.fn();
const publishDraft = vi.fn();
const exportDraft = vi.fn();
const toastMock = vi.fn();

vi.mock("@/api/adminApi", () => ({
  adminApi: {
    getDraft: (...a: unknown[]) => getDraft(...a),
    updateDraft: (...a: unknown[]) => updateDraft(...a),
    validateTemplate: (...a: unknown[]) => validateTemplate(...a),
    publishDraft: (...a: unknown[]) => publishDraft(...a),
    exportDraft: (...a: unknown[]) => exportDraft(...a),
  },
}));
vi.mock("@/components/ui/toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));
vi.mock("../downloadJson", () => ({ downloadJson: vi.fn() }));

// Kedua renderer wajib dipakai (AGENTS.md §6) — keduanya di-mock & dicatat props-nya.
const cssProps = vi.fn();
vi.mock("@/components/template/TemplateRenderer", () => ({
  TemplateRenderer: (p: Record<string, unknown>) => { cssProps(p); return <div data-testid="css-renderer" />; },
}));
const fabricProps = vi.fn();
vi.mock("@/components/editor/TemplateFabricCanvas", () => ({
  default: (p: Record<string, unknown>) => { fabricProps(p); return <div data-testid="fabric-renderer" />; },
}));

const RAW = { palette: "promo-red", elements: [{ type: "text", bind: "headline", x: 0.1, y: 0.2, width: 0.8, value: "Hai" }] };
const RESOLVED = {
  canvas: { aspect: "4:5", dimensions: { width: 1080, height: 1350 } },
  color_scheme: { accent: "#FF0000", primary: "#FFFFFF" },
  brand_theme: { color_slots: { accent: 0 } },
  elements: RAW.elements,
};

function draft(over: Partial<TemplateDraft> = {}): TemplateDraft {
  return {
    id: "d1", name: "Promo Baru", industry: "fnb", theme: "promo", copy_intent: "promotion",
    content_type: "instagram_post", is_premium: false, template_config: RAW,
    thumbnail_url: "/thumb.png", background_url: "/bg.png", source_template_id: null,
    created_at: "2026-10-20T00:00:00Z", updated_at: "2026-10-21T00:00:00Z", ...over,
  };
}

const OK: TemplateValidation = { valid: true, errors: [], warnings: [], resolved_config: RESOLVED as never };

function jsonBox() {
  return screen.getByLabelText("template_config (JSON)") as HTMLTextAreaElement;
}

describe("TemplateLab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDraft.mockResolvedValue(draft());
    validateTemplate.mockResolvedValue(OK);
  });

  it("memuat draft lalu menampilkan preview di KEDUA renderer dari config ter-resolve", async () => {
    render(<TemplateLab draftId="d1" />);
    expect(await screen.findByTestId("css-renderer")).toBeInTheDocument();
    expect(screen.getByTestId("fabric-renderer")).toBeInTheDocument();
    expect(validateTemplate).toHaveBeenCalledWith(RAW);

    const css = cssProps.mock.calls.at(-1)![0] as { backgroundUrl: string; thumbnailUrl: string };
    expect(css.backgroundUrl).toBe("/bg.png");
    const fabric = fabricProps.mock.calls.at(-1)![0] as { spec: { width: number; height: number } };
    expect(fabric.spec.width).toBe(1080);
    expect(fabric.spec.height).toBe(1350);
  });

  it("JSON rusak → pesan parse error, Publish nonaktif, backend tidak dipanggil", async () => {
    render(<TemplateLab draftId="d1" />);
    await screen.findByTestId("css-renderer");
    validateTemplate.mockClear();

    fireEvent.change(jsonBox(), { target: { value: "{ rusak" } });
    expect(await screen.findByText(/JSON tidak valid/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    await new Promise((r) => setTimeout(r, 450));
    expect(validateTemplate).not.toHaveBeenCalled();
  });

  it("error validasi dari backend ditampilkan dan memblokir Publish", async () => {
    validateTemplate.mockResolvedValue({ valid: false, errors: ["Wajib ada minimal 1 elemen text dengan bind \"headline\""], warnings: [], resolved_config: null });
    render(<TemplateLab draftId="d1" />);
    expect(await screen.findByText(/bind "headline"/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("peringatan tampil tapi tidak memblokir", async () => {
    validateTemplate.mockResolvedValue({ ...OK, warnings: ["Tidak ada slot gambar"] });
    render(<TemplateLab draftId="d1" />);
    expect(await screen.findByText("Tidak ada slot gambar")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled());
  });

  it("simpan draft mengirim metadata + config hasil parse", async () => {
    updateDraft.mockImplementation(async (_id, patch) => draft(patch));
    render(<TemplateLab draftId="d1" />);
    await screen.findByTestId("css-renderer");

    const name = screen.getByLabelText("Nama");
    await userEvent.clear(name);
    await userEvent.type(name, "Promo Final");
    fireEvent.change(jsonBox(), { target: { value: JSON.stringify({ ...RAW, palette: "retro-cream" }) } });
    await userEvent.click(screen.getByRole("button", { name: "Simpan draft" }));

    expect(updateDraft).toHaveBeenCalledWith("d1", expect.objectContaining({
      name: "Promo Final",
      template_config: { ...RAW, palette: "retro-cream" },
    }));
  });

  it("uji brand me-render preview dengan profil brand contoh", async () => {
    render(<TemplateLab draftId="d1" />);
    await screen.findByTestId("css-renderer");
    const before = cssProps.mock.calls.at(-1)![0] as { cfg: { color_scheme: Record<string, string> } };
    expect(before.cfg.color_scheme.accent).toBe("#FF0000");

    await userEvent.click(screen.getByRole("switch", { name: /uji brand/i }));
    const after = cssProps.mock.calls.at(-1)![0] as { cfg: { color_scheme: Record<string, string> } };
    expect(after.cfg.color_scheme.accent).not.toBe("#FF0000");
  });

  it("publish versi baru: simpan dulu, opsi nonaktifkan template asal, lalu kembali ke daftar", async () => {
    getDraft.mockResolvedValue(draft({ source_template_id: "t1" }));
    updateDraft.mockImplementation(async (_id, patch) => draft({ source_template_id: "t1", ...patch }));
    publishDraft.mockResolvedValue({ id: "t9", name: "Promo Baru" });
    render(<TemplateLab draftId="d1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled());

    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    await userEvent.click(screen.getByLabelText(/nonaktifkan template asal/i));
    await userEvent.click(screen.getByRole("button", { name: "Ya, publish" }));

    await waitFor(() => expect(publishDraft).toHaveBeenCalledWith("d1", true));
    expect(updateDraft.mock.invocationCallOrder[0]).toBeLessThan(publishDraft.mock.invocationCallOrder[0]);
    expect(push).toHaveBeenCalledWith("/admin/templates");
  });

  it("publish ditolak backend → pesan error, tetap di lab", async () => {
    updateDraft.mockImplementation(async (_id, patch) => draft(patch));
    publishDraft.mockRejectedValue(new Error("Nama template sudah dipakai"));
    render(<TemplateLab draftId="d1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, publish" }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ desc: "Nama template sudah dipakai" })));
    expect(push).not.toHaveBeenCalled();
  });

  it("draft tidak ditemukan → pesan error", async () => {
    getDraft.mockRejectedValue(new Error("Draft template tidak ditemukan."));
    render(<TemplateLab draftId="dx" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/gagal memuat draft/i);
  });
});
