import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateMetaModal } from "../TemplateMetaModal";
import type { AdminTemplate } from "@/api/adminApi";

const updateTemplate = vi.fn();
const uploadTemplateImage = vi.fn();
vi.mock("@/api/adminApi", () => ({
  adminApi: {
    updateTemplate: (...a: unknown[]) => updateTemplate(...a),
    uploadTemplateImage: (...a: unknown[]) => uploadTemplateImage(...a),
  },
}));
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }));

const TPL: AdminTemplate = {
  id: "t1", name: "Sushi Tei", industry: "fnb", theme: "promo", copy_intent: "promotion",
  content_type: "instagram_post", thumbnail_url: "/thumb.png", background_url: null,
  template_config: { color_scheme: {}, elements: [] } as unknown as AdminTemplate["template_config"], is_premium: false, is_active: true,
  created_at: null, usage_count: 0,
};

describe("TemplateMetaModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tidak menyediakan editor template_config (config live tidak boleh diubah)", () => {
    render(<TemplateMetaModal template={TPL} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByLabelText(/template_config/i)).not.toBeInTheDocument();
    expect(screen.getByText(/versi baru/i)).toBeInTheDocument();
  });

  it("simpan hanya mengirim field yang berubah", async () => {
    const onSaved = vi.fn();
    updateTemplate.mockResolvedValue({ ...TPL, name: "Sushi Tei 2026", is_premium: true });
    render(<TemplateMetaModal template={TPL} onClose={vi.fn()} onSaved={onSaved} />);

    const name = screen.getByLabelText("Nama");
    await userEvent.clear(name);
    await userEvent.type(name, "Sushi Tei 2026");
    await userEvent.click(screen.getByLabelText("Premium"));
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(updateTemplate).toHaveBeenCalledWith("t1", { name: "Sushi Tei 2026", is_premium: true });
    expect(onSaved).toHaveBeenCalled();
  });

  it("upload latar mengirim kind=background", async () => {
    uploadTemplateImage.mockResolvedValue({ ...TPL, background_url: "/bg.png" });
    render(<TemplateMetaModal template={TPL} onClose={vi.fn()} onSaved={vi.fn()} />);
    const file = new File(["x"], "bg.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Upload gambar latar"), file);
    expect(uploadTemplateImage).toHaveBeenCalledWith("t1", "background", file);
  });
});
