import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MiniTemplateCard } from "../MiniTemplateCard";
import type { TemplateListItem } from "@/types/template";

const renderSpy = vi.fn();

// Mock TemplateRenderer — assert the props the card forwards, not its internals.
vi.mock("@/components/template/TemplateRenderer", () => ({
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

const PROFILE = { brand_colors: ["#111111"], brand_font: "Poppins", logo_url: null };

function lastProps() {
  return renderSpy.mock.calls.at(-1)?.[0] as {
    cfg: { color_scheme: Record<string, string> };
    contact: unknown;
  };
}

describe("MiniTemplateCard", () => {
  it("live-renders via TemplateRenderer memakai config hasil resolver (branded → warna teradaptasi)", () => {
    renderSpy.mockClear();
    render(
      <MiniTemplateCard
        t={TEMPLATE}
        active={false}
        profile={PROFILE}
        branded
        contact={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByTestId("template-renderer-mock")).toBeInTheDocument();
    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({ thumbnailUrl: TEMPLATE.thumbnail_url, aspect: "4:5" }),
    );
    // Resolver dipanggil dengan branded=true → accent tidak lagi warna asli template.
    expect(lastProps().cfg.color_scheme.accent).not.toBe("#FF6B35");
  });

  it("unbranded → warna asli template dipertahankan", () => {
    renderSpy.mockClear();
    render(
      <MiniTemplateCard t={TEMPLATE} active={false} profile={PROFILE} branded={false} contact={null} onSelect={() => {}} />,
    );
    expect(lastProps().cfg.color_scheme.accent).toBe("#FF6B35");
  });

  it("kontak profil diteruskan saat branded; unbranded → null (footer pakai placeholder default)", () => {
    const contact = { website: "www.senja.com", instagram: "@kopisenja" } as never;

    renderSpy.mockClear();
    render(
      <MiniTemplateCard t={TEMPLATE} active={false} profile={PROFILE} branded contact={contact} onSelect={() => {}} />,
    );
    expect(lastProps().contact).toBe(contact);

    renderSpy.mockClear();
    render(
      <MiniTemplateCard t={TEMPLATE} active={false} profile={PROFILE} branded={false} contact={contact} onSelect={() => {}} />,
    );
    expect(lastProps().contact).toBeNull();
  });

  it("calls onSelect when the card is clicked", () => {
    const onSelect = vi.fn();
    render(
      <MiniTemplateCard t={TEMPLATE} active={false} profile={null} branded={false} contact={null} onSelect={onSelect} />,
    );
    screen.getByText("Promo Simple").click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("shows the Premium badge only for premium templates", () => {
    const { rerender } = render(
      <MiniTemplateCard t={TEMPLATE} active={false} profile={null} branded={false} contact={null} onSelect={() => {}} />,
    );
    expect(screen.queryByText("Premium")).toBeNull();

    rerender(
      <MiniTemplateCard t={{ ...TEMPLATE, is_premium: true }} active={false} profile={null} branded={false} contact={null} onSelect={() => {}} />,
    );
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });

  it("renders content_type and theme badges", () => {
    render(
      <MiniTemplateCard t={TEMPLATE} active={false} profile={null} branded={false} contact={null} onSelect={() => {}} />,
    );
    expect(screen.getByText("Single")).toBeInTheDocument();
    expect(screen.getByText("Ramadan")).toBeInTheDocument();
  });
});
