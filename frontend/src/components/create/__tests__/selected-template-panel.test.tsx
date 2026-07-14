import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SelectedTemplatePanel } from "../SelectedTemplatePanel";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";
import type { Template } from "@/types/template";

const renderSpy = vi.fn();

// Mock TemplateRenderer so this test asserts the EXACT props passed, not its
// internal DOM/canvas rendering (that's TemplateRenderer's own test surface).
vi.mock("@/components/template/TemplateRenderer", () => ({
  TemplateRenderer: (props: Record<string, unknown>) => {
    renderSpy(props);
    return <div data-testid="template-renderer-mock" />;
  },
}));

const TEMPLATE: Template = {
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
  created_at: "2026-01-01T00:00:00Z",
};

describe("SelectedTemplatePanel", () => {
  it("shows a loading placeholder (no TemplateRenderer) while template is null", () => {
    render(
      <SelectedTemplatePanel
        template={null}
        brandPreview={false}
        userBrandColors={null}
        userBrandFont={null}
        userLogoUrl={null}
        isCarousel={false}
        slideCount={5}
        onChangeTemplate={() => {}}
      />,
    );
    expect(screen.queryByTestId("template-renderer-mock")).toBeNull();
  });

  it("brandPreview=false → TemplateRenderer receives brandColors=null, brandFont=null (original)", () => {
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={false}
        userBrandColors={["#111111"]}
        userBrandFont="Poppins"
        userLogoUrl="/permanent/logos/u1/logo.png?v=1"
        isCarousel={false}
        slideCount={5}
        onChangeTemplate={() => {}}
      />,
    );
    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cfg: TEMPLATE.template_config,
        thumbnailUrl: TEMPLATE.thumbnail_url,
        brandColors: null,
        brandFont: null,
        logoUrl: null,
      }),
    );
  });

  it("brandPreview=true + user has colors/logo → TemplateRenderer receives user's brandColors/brandFont/logoUrl", () => {
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={true}
        userBrandColors={["#111111", "#222222"]}
        userBrandFont="Poppins"
        userLogoUrl="/permanent/logos/u1/logo.png?v=1"
        isCarousel={false}
        slideCount={5}
        onChangeTemplate={() => {}}
      />,
    );
    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        brandColors: ["#111111", "#222222"],
        brandFont: "Poppins",
        logoUrl: "/permanent/logos/u1/logo.png?v=1",
      }),
    );
  });

  it("brandPreview=true + user has no brand colors/logo → falls back to DEFAULT_COMPANY_PROFILE (never blank/error)", () => {
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={true}
        userBrandColors={null}
        userBrandFont={null}
        userLogoUrl={null}
        isCarousel={false}
        slideCount={5}
        onChangeTemplate={() => {}}
      />,
    );
    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        brandColors: DEFAULT_COMPANY_PROFILE.brand_colors,
        brandFont: null,
        logoUrl: DEFAULT_COMPANY_PROFILE.logo_url,
      }),
    );
  });

  it("calls onChangeTemplate when 'Ganti template' is clicked", async () => {
    const onChangeTemplate = vi.fn();
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={false}
        userBrandColors={null}
        userBrandFont={null}
        userLogoUrl={null}
        isCarousel={false}
        slideCount={5}
        onChangeTemplate={onChangeTemplate}
      />,
    );
    screen.getByText("Ganti template").click();
    expect(onChangeTemplate).toHaveBeenCalledTimes(1);
  });

  it("shows slide count badge when isCarousel is true", () => {
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={false}
        userBrandColors={null}
        userBrandFont={null}
        userLogoUrl={null}
        isCarousel={true}
        slideCount={6}
        onChangeTemplate={() => {}}
      />,
    );
    expect(screen.getByText("6 Slide")).toBeInTheDocument();
  });
});
