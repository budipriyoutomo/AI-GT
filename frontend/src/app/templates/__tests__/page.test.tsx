import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TemplatesPage from "../page";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/components/shell/shell", () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/template/TemplatePreviewModal", () => ({
  TemplatePreviewModal: () => null,
}));

const rendererProps = vi.fn();
vi.mock("@/components/template/TemplateRenderer", () => ({
  TemplateRenderer: (props: Record<string, unknown>) => {
    rendererProps(props);
    return <div data-testid="template-renderer" />;
  },
}));

vi.mock("@/api/templatesApi", () => ({
  templatesApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: "tpl-1",
        name: "Promo Simple",
        content_type: "Single",
        industry: "F&B / Kuliner",
        theme: "",
        layout_type: "single",
        thumbnail_url: "/thumb.png",
        background_url: null,
        is_premium: false,
        template_config: { color_scheme: {}, elements: [] },
      },
    ]),
  },
}));

// The user's *real* brand data — the grid must NOT use this. Only the preview
// modal (opened per-card) shows the real brand; the grid always shows the
// static, non-personalized default logo with no color/font adaptation.
vi.mock("@/api/companyProfileApi", () => ({
  companyProfileApi: {
    get: vi.fn().mockResolvedValue({
      logo_url: "/permanent/logos/u1/logo.png?v=1",
      brand_colors: ["#111111"],
      brand_font: "Poppins",
    }),
  },
}));

describe("/templates gallery grid — generic default logo, no brand adaptation", () => {
  beforeEach(() => {
    rendererProps.mockClear();
  });

  it("shows the static DEFAULT_COMPANY_PROFILE logo in the grid card, not the user's real logo", async () => {
    render(<TemplatesPage />);

    await waitFor(() => expect(screen.getByTestId("template-renderer")).toBeTruthy());
    await waitFor(() => {
      const lastCall = rendererProps.mock.calls.at(-1)?.[0] as { cfg?: { logoUrl?: string | null } };
      expect(lastCall.cfg?.logoUrl).toBe(DEFAULT_COMPANY_PROFILE.logo_url);
    });

    const lastCall = rendererProps.mock.calls.at(-1)?.[0] as { cfg?: { logoUrl?: string | null } };
    expect(lastCall.cfg?.logoUrl).not.toBe("/permanent/logos/u1/logo.png?v=1");
  });

  it("does not brand-adapt the grid card colors (galeri = generic/unbranded)", async () => {
    render(<TemplatesPage />);

    await waitFor(() => expect(screen.getByTestId("template-renderer")).toBeTruthy());

    const lastCall = rendererProps.mock.calls.at(-1)?.[0] as { cfg?: { color_scheme?: Record<string, string> } };
    // template_config di mock punya color_scheme kosong ({}); resolver unbranded tidak
    // pernah menyentuhnya (adaptScheme early-return saat brandColors null).
    expect(lastCall.cfg?.color_scheme).toEqual({});
  });
});
