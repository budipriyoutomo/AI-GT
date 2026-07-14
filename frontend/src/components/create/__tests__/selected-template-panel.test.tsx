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

function lastCfg() {
  return renderSpy.mock.calls.at(-1)?.[0] as {
    cfg: { color_scheme: Record<string, string>; logoUrl: string | null };
  };
}

describe("SelectedTemplatePanel", () => {
  it("shows a loading placeholder (no TemplateRenderer) while template is null", () => {
    render(
      <SelectedTemplatePanel
        template={null}
        brandPreview={false}
        userBrandColors={null}
        userBrandFont={null}
        contact={null}
        userLogoUrl={null}
        isCarousel={false}
        slideCount={5}
        hasBrand={false}
        onToggleBrand={() => {}}
        onChangeTemplate={() => {}}
      />,
    );
    expect(screen.queryByTestId("template-renderer-mock")).toBeNull();
  });

  it("brandPreview=false → TemplateRenderer receives original colors + default logo (unbranded)", () => {
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={false}
        userBrandColors={["#111111"]}
        userBrandFont="Poppins"
        contact={null}
        userLogoUrl="/permanent/logos/u1/logo.png?v=1"
        isCarousel={false}
        slideCount={5}
        hasBrand={false}
        onToggleBrand={() => {}}
        onChangeTemplate={() => {}}
      />,
    );
    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        thumbnailUrl: TEMPLATE.thumbnail_url,
        cfg: expect.objectContaining({
          color_scheme: { accent: "#FF6B35", primary: "#FFFFFF", secondary: "#1A1A1A" },
          logoUrl: DEFAULT_COMPANY_PROFILE.logo_url,
        }),
      }),
    );
  });

  it("brandPreview=true + user has colors/logo → TemplateRenderer receives branded colors/logo", () => {
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={true}
        userBrandColors={["#111111", "#222222"]}
        userBrandFont="Poppins"
        contact={null}
        userLogoUrl="/permanent/logos/u1/logo.png?v=1"
        isCarousel={false}
        slideCount={5}
        hasBrand={false}
        onToggleBrand={() => {}}
        onChangeTemplate={() => {}}
      />,
    );
    expect(lastCfg().cfg.color_scheme.accent).not.toBe("#FF6B35");
    expect(lastCfg().cfg.logoUrl).toBe("https://cdn.calira.my.id/permanent/logos/u1/logo.png?v=1");
  });

  it("brandPreview=true + user has no brand colors/logo → tidak crash; tidak ada data untuk di-brand jadi tampilan asli/hidden apa adanya", () => {
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={true}
        userBrandColors={null}
        userBrandFont={null}
        contact={null}
        userLogoUrl={null}
        isCarousel={false}
        slideCount={5}
        hasBrand={false}
        onToggleBrand={() => {}}
        onChangeTemplate={() => {}}
      />,
    );
    // branded=true + no user logo → hidden (null), NOT the default (Handoff 0 §4.7 contract).
    // Resolver §3.2 step 1 hanya swap SUMBER profil (branded ? profile : DEFAULT) — tidak
    // per-field fallback ke DEFAULT saat branded=true tapi field kosong (beda dari behavior
    // lama brand-preview.ts, sengaja disederhanakan: satu resolver, satu aturan eksplisit).
    expect(lastCfg().cfg.logoUrl).toBeNull();
    expect(lastCfg().cfg.color_scheme.accent).toBe("#FF6B35"); // tidak ada brand color → warna template asli
  });

  it("calls onChangeTemplate when 'Ganti template' is clicked", async () => {
    const onChangeTemplate = vi.fn();
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={false}
        userBrandColors={null}
        userBrandFont={null}
        contact={null}
        userLogoUrl={null}
        isCarousel={false}
        slideCount={5}
        hasBrand={false}
        onToggleBrand={() => {}}
        onChangeTemplate={onChangeTemplate}
      />,
    );
    screen.getByText("Ganti template").click();
    expect(onChangeTemplate).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleBrand when the brand-preview toggle is clicked", () => {
    const onToggleBrand = vi.fn();
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={false}
        userBrandColors={["#111111"]}
        userBrandFont="Poppins"
        contact={null}
        userLogoUrl={null}
        hasBrand={true}
        onToggleBrand={onToggleBrand}
        isCarousel={false}
        slideCount={5}
        onChangeTemplate={() => {}}
      />,
    );
    screen.getByText("Preview dengan brand color").click();
    expect(onToggleBrand).toHaveBeenCalledTimes(1);
  });

  it("toggle prompts to set brand color when the user has none", () => {
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={false}
        userBrandColors={null}
        userBrandFont={null}
        contact={null}
        userLogoUrl={null}
        hasBrand={false}
        onToggleBrand={() => {}}
        isCarousel={false}
        slideCount={5}
        onChangeTemplate={() => {}}
      />,
    );
    expect(screen.getByText("Atur brand color")).toBeInTheDocument();
  });

  it("toggle shows 'Kembali ke original' when brand preview is active", () => {
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={true}
        userBrandColors={["#111111"]}
        userBrandFont="Poppins"
        contact={null}
        userLogoUrl={null}
        hasBrand={true}
        onToggleBrand={() => {}}
        isCarousel={false}
        slideCount={5}
        onChangeTemplate={() => {}}
      />,
    );
    expect(screen.getByText("Kembali ke original")).toBeInTheDocument();
  });

  it("shows slide count badge when isCarousel is true", () => {
    render(
      <SelectedTemplatePanel
        template={TEMPLATE}
        brandPreview={false}
        userBrandColors={null}
        userBrandFont={null}
        contact={null}
        userLogoUrl={null}
        isCarousel={true}
        slideCount={6}
        hasBrand={false}
        onToggleBrand={() => {}}
        onChangeTemplate={() => {}}
      />,
    );
    expect(screen.getByText("6 Slide")).toBeInTheDocument();
  });
});
