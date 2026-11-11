import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminTemplatesPanel } from "../AdminTemplatesPanel";
import type { AdminTemplate, TemplateDraft } from "@/api/adminApi";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const listTemplates = vi.fn();
const updateTemplate = vi.fn();
const deleteTemplate = vi.fn();
const exportTemplate = vi.fn();
const listDrafts = vi.fn();
const createDraft = vi.fn();
const deleteDraft = vi.fn();
const toastMock = vi.fn();
const downloadJson = vi.fn();

vi.mock("@/api/adminApi", () => ({
  adminApi: {
    listTemplates: (...a: unknown[]) => listTemplates(...a),
    updateTemplate: (...a: unknown[]) => updateTemplate(...a),
    deleteTemplate: (...a: unknown[]) => deleteTemplate(...a),
    exportTemplate: (...a: unknown[]) => exportTemplate(...a),
    listDrafts: (...a: unknown[]) => listDrafts(...a),
    createDraft: (...a: unknown[]) => createDraft(...a),
    deleteDraft: (...a: unknown[]) => deleteDraft(...a),
    uploadTemplateImage: vi.fn(),
  },
}));
vi.mock("@/components/ui/toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));
vi.mock("../downloadJson", () => ({ downloadJson: (...a: unknown[]) => downloadJson(...a) }));
vi.mock("@/components/template/TemplateRenderer", () => ({
  TemplateRenderer: () => <div data-testid="template-renderer" />,
}));

const CONFIG = { color_scheme: {}, elements: [] } as unknown as AdminTemplate["template_config"];

function tpl(over: Partial<AdminTemplate> = {}): AdminTemplate {
  return {
    id: "t1", name: "Sushi Tei", industry: "fnb", theme: "promo", copy_intent: "promotion",
    content_type: "instagram_post", thumbnail_url: "/thumb.png", background_url: null,
    template_config: CONFIG, is_premium: false, is_active: true, created_at: "2026-10-01T00:00:00Z",
    usage_count: 0, ...over,
  };
}

function draft(over: Partial<TemplateDraft> = {}): TemplateDraft {
  return {
    id: "d1", name: "Draft Kopi", industry: "fnb", theme: "promo", copy_intent: null,
    content_type: "instagram_post", is_premium: false, template_config: {}, thumbnail_url: null,
    background_url: null, source_template_id: null,
    created_at: "2026-10-20T00:00:00Z", updated_at: "2026-10-21T00:00:00Z", ...over,
  };
}

function row(name: string) {
  return screen.getByRole("cell", { name }).closest("tr") as HTMLElement;
}

describe("AdminTemplatesPanel — template live", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTemplates.mockResolvedValue({ items: [tpl(), tpl({ id: "t2", name: "Retro", is_active: false, usage_count: 4 })] });
    listDrafts.mockResolvedValue({ items: [] });
  });

  it("menampilkan status, pemakaian, dan preview CSS", async () => {
    render(<AdminTemplatesPanel />);
    await screen.findByRole("cell", { name: "Sushi Tei" });
    expect(within(row("Retro")).getByText("Nonaktif")).toBeInTheDocument();
    expect(within(row("Retro")).getByText("4×")).toBeInTheDocument();
    expect(screen.getAllByTestId("template-renderer")).toHaveLength(2);
  });

  it("nonaktifkan template memanggil PATCH is_active lalu memuat ulang", async () => {
    updateTemplate.mockResolvedValue(tpl({ is_active: false }));
    render(<AdminTemplatesPanel />);
    await screen.findByRole("cell", { name: "Sushi Tei" });

    await userEvent.click(within(row("Sushi Tei")).getByRole("button", { name: "Nonaktifkan" }));
    expect(updateTemplate).toHaveBeenCalledWith("t1", { is_active: false });
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(2));
  });

  it("versi baru membuat draft dari template asal lalu membuka Template Lab", async () => {
    createDraft.mockResolvedValue(draft({ id: "d9", source_template_id: "t1" }));
    render(<AdminTemplatesPanel />);
    await screen.findByRole("cell", { name: "Sushi Tei" });

    await userEvent.click(within(row("Sushi Tei")).getByRole("button", { name: "Versi baru" }));
    expect(createDraft).toHaveBeenCalledWith("t1");
    expect(push).toHaveBeenCalledWith("/admin/templates/lab/d9");
  });

  it("template yang sudah dipakai tidak bisa dihapus", async () => {
    render(<AdminTemplatesPanel />);
    await screen.findByRole("cell", { name: "Retro" });
    expect(within(row("Retro")).getByRole("button", { name: "Hapus" })).toBeDisabled();
  });

  it("hapus template yang belum dipakai butuh konfirmasi", async () => {
    deleteTemplate.mockResolvedValue(null);
    render(<AdminTemplatesPanel />);
    await screen.findByRole("cell", { name: "Sushi Tei" });

    await userEvent.click(within(row("Sushi Tei")).getByRole("button", { name: "Hapus" }));
    expect(deleteTemplate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Ya, hapus" }));
    expect(deleteTemplate).toHaveBeenCalledWith("t1");
  });

  it("unduh JSON memakai format seed dari backend", async () => {
    exportTemplate.mockResolvedValue({ filename: "sushi-tei.json", content: { name: "Sushi Tei" } });
    render(<AdminTemplatesPanel />);
    await screen.findByRole("cell", { name: "Sushi Tei" });

    await userEvent.click(within(row("Sushi Tei")).getByRole("button", { name: "Unduh JSON" }));
    await waitFor(() => expect(downloadJson).toHaveBeenCalledWith("sushi-tei.json", { name: "Sushi Tei" }));
  });

  it("gagal memuat → pesan error dengan Coba lagi", async () => {
    listTemplates.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce({ items: [tpl()] });
    render(<AdminTemplatesPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat template");
    await userEvent.click(screen.getByRole("button", { name: /coba lagi/i }));
    expect(await screen.findByRole("cell", { name: "Sushi Tei" })).toBeInTheDocument();
  });
});

describe("AdminTemplatesPanel — draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTemplates.mockResolvedValue({ items: [] });
    listDrafts.mockResolvedValue({ items: [draft()] });
  });

  it("template baru membuat draft kosong lalu membuka Template Lab", async () => {
    createDraft.mockResolvedValue(draft({ id: "d2" }));
    render(<AdminTemplatesPanel />);
    await userEvent.click(await screen.findByRole("button", { name: /template baru/i }));
    expect(createDraft).toHaveBeenCalledWith(undefined);
    expect(push).toHaveBeenCalledWith("/admin/templates/lab/d2");
  });

  it("tab Draft menampilkan draft dan tautan ke lab", async () => {
    render(<AdminTemplatesPanel />);
    await userEvent.click(await screen.findByRole("tab", { name: /draft/i }));
    expect(await screen.findByRole("link", { name: "Draft Kopi" })).toHaveAttribute("href", "/admin/templates/lab/d1");
  });

  it("hapus draft memanggil API", async () => {
    deleteDraft.mockResolvedValue(null);
    render(<AdminTemplatesPanel />);
    await userEvent.click(await screen.findByRole("tab", { name: /draft/i }));
    await screen.findByRole("link", { name: "Draft Kopi" });
    await userEvent.click(screen.getByRole("button", { name: "Hapus draft Draft Kopi" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, hapus" }));
    expect(deleteDraft).toHaveBeenCalledWith("d1");
  });
});
