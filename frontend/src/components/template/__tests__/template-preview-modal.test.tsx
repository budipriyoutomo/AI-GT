import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplatePreviewModal } from "../TemplatePreviewModal";
import type { TemplateListItem } from "@/types/template";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const renderSpy = vi.fn();
vi.mock("../TemplateRenderer", () => ({
  TemplateRenderer: (props: Record<string, unknown>) => {
    renderSpy(props);
    return <div data-testid="template-renderer-mock" />;
  },
}));

const TEMPLATE: TemplateListItem = {
  id: "tpl-1",
  name: "Promo Simple",
  industry: "F&B / Kuliner",
  theme: "Ramadan",
  content_type: "Single",
  layout_type: "promo_simple",
  thumbnail_url: "https://cdn.example.com/thumb.png",
  background_url: null,
  is_premium: false,
  template_config: {
    color_scheme: { accent: "#FF6B35", primary: "#FFFFFF", secondary: "#1A1A1A" },
    elements: [],
  },
};

describe("TemplatePreviewModal", () => {
  beforeEach(() => {
    push.mockClear();
    renderSpy.mockClear();
  });

  it("live-renders via TemplateRenderer (not a static image)", () => {
    render(
      <TemplatePreviewModal
        template={TEMPLATE}
        brandColors={["#111111"]}
        brandFont="Poppins"
        buildHref={() => "/create?templateId=tpl-1"}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId("template-renderer-mock")).toBeInTheDocument();
    expect(renderSpy).toHaveBeenCalledWith(expect.objectContaining({ brandColors: null }));
  });

  it("toggle 'Preview dengan brand color' switches TemplateRenderer to branded colors, and back", async () => {
    const user = userEvent.setup();
    render(
      <TemplatePreviewModal
        template={TEMPLATE}
        brandColors={["#111111"]}
        brandFont="Poppins"
        buildHref={() => "/create?templateId=tpl-1"}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByText("Preview dengan brand color"));
    expect(renderSpy).toHaveBeenLastCalledWith(expect.objectContaining({ brandColors: ["#111111"], brandFont: "Poppins" }));

    await user.click(screen.getByText("Kembali ke original"));
    expect(renderSpy).toHaveBeenLastCalledWith(expect.objectContaining({ brandColors: null, brandFont: null }));
  });

  it("'Pakai template ini' calls buildHref with the CURRENT toggle state (false by default)", async () => {
    const user = userEvent.setup();
    const buildHref = vi.fn(() => "/create?templateId=tpl-1&brandPreview=false");
    render(
      <TemplatePreviewModal
        template={TEMPLATE}
        brandColors={["#111111"]}
        brandFont="Poppins"
        buildHref={buildHref}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByText("Pakai template ini"));
    expect(buildHref).toHaveBeenCalledWith(false);
    expect(push).toHaveBeenCalledWith("/create?templateId=tpl-1&brandPreview=false");
  });

  it("after toggling ON, 'Pakai template ini' calls buildHref(true)", async () => {
    const user = userEvent.setup();
    const buildHref = vi.fn((bp: boolean) => `/create?templateId=tpl-1&brandPreview=${bp}`);
    render(
      <TemplatePreviewModal
        template={TEMPLATE}
        brandColors={["#111111"]}
        brandFont="Poppins"
        buildHref={buildHref}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByText("Preview dengan brand color"));
    await user.click(screen.getByText("Pakai template ini"));
    expect(buildHref).toHaveBeenCalledWith(true);
    expect(push).toHaveBeenCalledWith("/create?templateId=tpl-1&brandPreview=true");
  });

  it("no brand colors set → toggle redirects to Settings instead of enabling preview (unchanged behavior)", async () => {
    const user = userEvent.setup();
    render(
      <TemplatePreviewModal
        template={TEMPLATE}
        brandColors={null}
        brandFont={null}
        buildHref={() => "/create?templateId=tpl-1"}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByText("Preview dengan brand color"));
    expect(push).toHaveBeenCalledWith("/settings?focus=brand");
    // still unbranded — toggle did not flip
    expect(renderSpy).toHaveBeenLastCalledWith(expect.objectContaining({ brandColors: null }));
  });
});
