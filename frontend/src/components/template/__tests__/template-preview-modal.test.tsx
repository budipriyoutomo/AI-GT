import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplatePreviewModal } from "../TemplatePreviewModal";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";
import type { BrandSource } from "@/lib/template/resolve";
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

const PROFILE: BrandSource = {
  brand_colors: ["#111111"],
  brand_font: "Poppins",
  logo_url: "/permanent/logos/u1/logo.png?v=1",
};

function lastCfg() {
  return renderSpy.mock.calls.at(-1)?.[0] as { cfg: { color_scheme: Record<string, string>; logoUrl: string | null } };
}

describe("TemplatePreviewModal", () => {
  beforeEach(() => {
    push.mockClear();
    renderSpy.mockClear();
  });

  it("live-renders via TemplateRenderer (not a static image)", () => {
    render(
      <TemplatePreviewModal
        template={TEMPLATE}
        profile={PROFILE}
        contact={null}
        buildHref={() => "/create?templateId=tpl-1"}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId("template-renderer-mock")).toBeInTheDocument();
    // Unbranded by default: original colors, but the static default logo still shows
    // (matches the gallery grid) — not the user's real logo, and not hidden.
    expect(lastCfg().cfg.color_scheme.accent).toBe("#FF6B35");
    expect(lastCfg().cfg.logoUrl).toBe(DEFAULT_COMPANY_PROFILE.logo_url);
  });

  it("toggle 'Preview dengan brand color' switches TemplateRenderer to branded colors/logo, and back", async () => {
    const user = userEvent.setup();
    render(
      <TemplatePreviewModal
        template={TEMPLATE}
        profile={PROFILE}
        contact={null}
        buildHref={() => "/create?templateId=tpl-1"}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByText("Preview dengan brand color"));
    expect(lastCfg().cfg.color_scheme.accent).not.toBe("#FF6B35");
    expect(lastCfg().cfg.logoUrl).toBe("https://cdn.calira.my.id/permanent/logos/u1/logo.png?v=1");

    await user.click(screen.getByText("Kembali ke original"));
    expect(lastCfg().cfg.color_scheme.accent).toBe("#FF6B35");
    expect(lastCfg().cfg.logoUrl).toBe(DEFAULT_COMPANY_PROFILE.logo_url);
  });

  it("'Pakai template ini' calls buildHref with the CURRENT toggle state (false by default)", async () => {
    const user = userEvent.setup();
    const buildHref = vi.fn(() => "/create?templateId=tpl-1&brandPreview=false");
    render(
      <TemplatePreviewModal
        template={TEMPLATE}
        profile={PROFILE}
        contact={null}
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
        profile={PROFILE}
        contact={null}
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
        profile={{ brand_colors: null, brand_font: null, logo_url: null }}
        contact={null}
        buildHref={() => "/create?templateId=tpl-1"}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByText("Preview dengan brand color"));
    expect(push).toHaveBeenCalledWith("/settings?focus=brand");
    // still unbranded — toggle did not flip
    expect(lastCfg().cfg.color_scheme.accent).toBe("#FF6B35");
  });
});
